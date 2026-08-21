/**
 * Systematic-carousel fountain code — Ported from Decimen
 * 
 * Replaces the old robust-soliton LT code with a zero-overhead systematic sweep
 * followed by uniform mid-degree repair frames.
 */

export function splitmix32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}

function frameSeed(sessionId: number, seq: number): number {
  let h = (Math.imul(sessionId + 1, 0x9e3779b1) ^ (seq + 0x85ebca6b)) | 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) | 0;
}

export function cycleLength(k: number): number {
  return 2 * k;
}

const REPAIR_DEGREE_MIN = 4;
const REPAIR_DEGREE_MAX = 24;

function repairIndices(k: number, sessionId: number, seq: number): number[] {
  const rnd = splitmix32(frameSeed(sessionId, seq));
  const d = Math.min(k, REPAIR_DEGREE_MIN + (rnd() % (REPAIR_DEGREE_MAX - REPAIR_DEGREE_MIN + 1)));
  const set = new Set<number>();
  while (set.size < d) set.add(rnd() % k);
  return [...set];
}

export function frameComposition(k: number, sessionId: number, seq: number): number[] {
  const pos = seq % cycleLength(k);
  return pos < k ? [pos] : repairIndices(k, sessionId, seq);
}

function xorInto(dst: Uint32Array, src: Uint32Array): void {
  for (let i = 0; i < dst.length; i++) dst[i] = (dst[i]! ^ src[i]!) >>> 0;
}

class LTEncoder {
  readonly k: number;
  private readonly words: number;
  private readonly blocks: Uint32Array;

  constructor(
    payload: Uint8Array,
    readonly blockLen: number,
    readonly sessionId: number,
  ) {
    this.k = Math.max(1, Math.ceil(payload.length / blockLen));
    this.words = Math.ceil(blockLen / 4);
    this.blocks = new Uint32Array(this.k * this.words);
    const bytes = new Uint8Array(this.blocks.buffer);
    for (let b = 0; b < this.k; b++) {
      const src = payload.subarray(b * blockLen, Math.min((b + 1) * blockLen, payload.length));
      bytes.set(src, b * this.words * 4);
    }
  }

  encode(seq: number): Uint8Array {
    const idx = frameComposition(this.k, this.sessionId, seq);
    const out = new Uint32Array(this.words);
    for (const b of idx) {
      const off = b * this.words;
      for (let w = 0; w < this.words; w++) out[w] = (out[w]! ^ this.blocks[off + w]!) >>> 0;
    }
    return new Uint8Array(out.buffer, 0, this.blockLen);
  }
}

interface PendingFrame {
  idx: Set<number>;
  words: Uint32Array;
}

class LTDecoder {
  private readonly words: number;
  private readonly solved: (Uint32Array | null)[];
  private readonly byBlock = new Map<number, Set<PendingFrame>>();
  private readonly seen = new Set<number>();
  solvedCount = 0;
  framesNew = 0;
  framesDup = 0;
  framesRedundant = 0;
  
  // Expose this for progress calculation
  get decodedCount() {
    return this.solvedCount;
  }

  constructor(
    readonly k: number,
    readonly blockLen: number,
    readonly sessionId: number,
    readonly totalLen: number,
  ) {
    this.words = Math.ceil(blockLen / 4);
    this.solved = new Array<Uint32Array | null>(k).fill(null);
  }

  get isComplete(): boolean {
    return this.solvedCount >= this.k;
  }

  addFrame(seq: number, block: Uint8Array): boolean {
    if (this.seen.has(seq)) {
      this.framesDup++;
      return false; // Not useful
    }
    this.seen.add(seq);
    this.framesNew++;
    if (this.isComplete) return false;

    const idx = new Set(frameComposition(this.k, this.sessionId, seq));
    const words = new Uint32Array(this.words);
    new Uint8Array(words.buffer).set(block.subarray(0, this.blockLen));
    for (const b of [...idx]) {
      const s = this.solved[b];
      if (s) {
        xorInto(words, s);
        idx.delete(b);
      }
    }
    if (idx.size === 0) {
      this.framesRedundant++;
      return false; // Not useful (redundant)
    }
    if (idx.size === 1) {
      this.resolve(idx.values().next().value!, words);
      return true; // Useful!
    }
    const pf: PendingFrame = { idx, words };
    for (const b of idx) {
      let set = this.byBlock.get(b);
      if (!set) {
        set = new Set();
        this.byBlock.set(b, set);
      }
      set.add(pf);
    }
    return true; // Useful!
  }

  private resolve(b0: number, w0: Uint32Array): void {
    const queue: [number, Uint32Array][] = [[b0, w0]];
    while (queue.length > 0) {
      const [b, w] = queue.pop()!;
      if (this.solved[b]) continue;
      this.solved[b] = w;
      this.solvedCount++;
      const waiting = this.byBlock.get(b);
      if (!waiting) continue;
      this.byBlock.delete(b);
      for (const pf of waiting) {
        xorInto(pf.words, w);
        pf.idx.delete(b);
        if (pf.idx.size === 1) {
          const r = pf.idx.values().next().value!;
          this.byBlock.get(r)?.delete(pf);
          if (!this.solved[r]) queue.push([r, pf.words]);
        }
      }
    }
  }

  assemble(): Uint8Array | null {
    if (!this.isComplete) return null;
    const out = new Uint8Array(this.totalLen);
    for (let b = 0; b < this.k; b++) {
      const start = b * this.blockLen;
      const len = Math.min(this.blockLen, this.totalLen - start);
      if (len > 0) out.set(new Uint8Array(this.solved[b]!.buffer, 0, len), start);
    }
    return out;
  }
}

// --------------------------------------------------------------------------------
// Adapter Wrappers to maintain compatibility with LightDrop's existing interfaces
// --------------------------------------------------------------------------------

export class FountainEncoder {
  private lt: LTEncoder;
  private seq = 0;
  private _blockSize: number;

  constructor(sourceData: Uint8Array, blockSize: number) {
    this._blockSize = blockSize;
    // We use a fixed sessionId of 0 for simplicity, since LightDrop's 
    // protocol handles transfer uniqueness via `transferId` in the manifest/header.
    // The fountain code just needs a deterministic sequence.
    this.lt = new LTEncoder(sourceData, blockSize, 0);
  }

  get totalBlocks(): number {
    return this.lt.k;
  }

  get blockSize(): number {
    return this._blockSize;
  }

  nextSymbol(): { seed: number; data: Uint8Array } {
    const currentSeq = this.seq++;
    const data = this.lt.encode(currentSeq);
    return { seed: currentSeq, data };
  }
}

export class FountainDecoder {
  private lt: LTDecoder;
  private _totalBlocks: number;
  private _blockSize: number;

  constructor(totalBlocks: number, blockSize: number) {
    this._totalBlocks = totalBlocks;
    this._blockSize = blockSize;
    // Same fixed sessionId=0 as the encoder
    this.lt = new LTDecoder(totalBlocks, blockSize, 0, totalBlocks * blockSize);
  }

  get isComplete(): boolean {
    return this.lt.isComplete;
  }

  get decodedCount(): number {
    return this.lt.decodedCount;
  }

  get progress(): number {
    return this.lt.decodedCount / this._totalBlocks;
  }

  addSymbol(seed: number, data: Uint8Array): boolean {
    // In LightDrop's protocol, `seed` is exactly the `seq` number.
    return this.lt.addFrame(seed, data);
  }

  getDecodedData(exactLength: number): Uint8Array {
    const data = this.lt.assemble();
    if (!data) throw new Error("FountainDecoder: data not completely decoded yet");
    return data.slice(0, exactLength);
  }
}
