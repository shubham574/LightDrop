import { PRNG } from './prng';
import { buildRobustSolitonCDF, sampleDegree } from './soliton';

export class FountainEncoder {
  private blocks: Uint8Array[] = [];
  private cdf: Float64Array;
  private seedCounter: number = 1;
  private _symbolsGenerated: number = 0;
  private _totalBlocks: number;
  private _blockSize: number;

  constructor(sourceData: Uint8Array, blockSize: number) {
    this._blockSize = blockSize;
    this._totalBlocks = Math.ceil(sourceData.length / blockSize);

    for (let i = 0; i < this._totalBlocks; i++) {
      const block = new Uint8Array(blockSize);
      const start = i * blockSize;
      const end = Math.min(start + blockSize, sourceData.length);
      block.set(sourceData.subarray(start, end));
      this.blocks.push(block);
    }

    this.cdf = buildRobustSolitonCDF(this._totalBlocks);
  }

  get totalBlocks(): number {
    return this._totalBlocks;
  }

  get blockSize(): number {
    return this._blockSize;
  }

  get symbolsGenerated(): number {
    return this._symbolsGenerated;
  }

  nextSymbol(): { seed: number, data: Uint8Array } {
    const seed = this.seedCounter++;
    const prng = new PRNG(seed);
    let d = sampleDegree(this.cdf, prng.nextFloat());
    d = Math.max(1, Math.min(d, this._totalBlocks)); // clamp

    const indices = prng.sample(this._totalBlocks, d);
    const data = new Uint8Array(this._blockSize);

    for (const index of indices) {
      const block = this.blocks[index];
      for (let i = 0; i < this._blockSize; i++) {
        data[i] ^= block[i];
      }
    }

    this._symbolsGenerated++;
    return { seed, data };
  }

  createManifestSymbol(): { seed: number, data: Uint8Array } {
    return { seed: 0, data: new Uint8Array(this._blockSize) };
  }
}
