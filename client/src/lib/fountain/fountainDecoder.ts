import { PRNG } from './prng';
import { buildRobustSolitonCDF, sampleDegree } from './soliton';

interface PendingSymbol {
  seed: number;
  data: Uint8Array;
  indices: Set<number>;
}

export class FountainDecoder {
  private _totalBlocks: number;
  private _blockSize: number;
  private cdf: Float64Array;
  private decoded: (Uint8Array | null)[];
  private _decodedCount: number = 0;
  private pending: PendingSymbol[] = [];
  private seenSeeds: Set<number> = new Set();

  constructor(totalBlocks: number, blockSize: number) {
    this._totalBlocks = totalBlocks;
    this._blockSize = blockSize;
    this.cdf = buildRobustSolitonCDF(totalBlocks);
    this.decoded = new Array(totalBlocks).fill(null);
  }

  get isComplete(): boolean {
    return this._decodedCount === this._totalBlocks;
  }

  get decodedCount(): number {
    return this._decodedCount;
  }

  get totalBlocks(): number {
    return this._totalBlocks;
  }

  get progress(): number {
    return this._decodedCount / this._totalBlocks;
  }

  addSymbol(seed: number, data: Uint8Array): boolean {
    if (this.seenSeeds.has(seed)) {
      return false;
    }
    this.seenSeeds.add(seed);

    const prng = new PRNG(seed);
    let d = sampleDegree(this.cdf, prng.nextFloat());
    d = Math.max(1, Math.min(d, this._totalBlocks));

    const indicesArray = prng.sample(this._totalBlocks, d);
    const indices = new Set(indicesArray);
    
    // Create a copy of the data since we'll modify it
    const symbolData = new Uint8Array(data);

    // XOR out any already-decoded blocks
    for (const index of Array.from(indices)) {
      if (this.decoded[index] !== null) {
        const decodedBlock = this.decoded[index]!;
        for (let i = 0; i < this._blockSize; i++) {
          symbolData[i] ^= decodedBlock[i];
        }
        indices.delete(index);
      }
    }

    if (indices.size === 0) {
      return false;
    }

    if (indices.size === 1) {
      const blockIndex = indices.values().next().value as number;
      this.decoded[blockIndex] = symbolData;
      this._decodedCount++;
      this.propagate(blockIndex);
      return true;
    }

    this.pending.push({ seed, data: symbolData, indices });
    return false;
  }

  private propagate(blockIndex: number): void {
    const decodedBlock = this.decoded[blockIndex]!;
    let newDecoded: number[] = [];

    // Filter pending and process
    const remainingPending: PendingSymbol[] = [];

    for (const symbol of this.pending) {
      if (symbol.indices.has(blockIndex)) {
        for (let i = 0; i < this._blockSize; i++) {
          symbol.data[i] ^= decodedBlock[i];
        }
        symbol.indices.delete(blockIndex);

        if (symbol.indices.size === 1) {
          const newIndex = symbol.indices.values().next().value as number;
          if (this.decoded[newIndex] === null) {
            this.decoded[newIndex] = symbol.data;
            this._decodedCount++;
            newDecoded.push(newIndex);
          }
          continue; // Symbol is fully processed
        } else if (symbol.indices.size === 0) {
          continue; // Redundant
        }
      }
      remainingPending.push(symbol);
    }

    this.pending = remainingPending;

    // Recursively propagate
    for (const newIndex of newDecoded) {
      this.propagate(newIndex);
    }
  }

  getDecodedData(originalSize: number): Uint8Array {
    if (!this.isComplete) {
      throw new Error("Decoding not complete");
    }

    const result = new Uint8Array(originalSize);
    let offset = 0;
    
    for (let i = 0; i < this._totalBlocks; i++) {
      const block = this.decoded[i]!;
      const copyLen = Math.min(this._blockSize, originalSize - offset);
      result.set(block.subarray(0, copyLen), offset);
      offset += copyLen;
      if (offset >= originalSize) {
        break;
      }
    }

    return result;
  }
}
