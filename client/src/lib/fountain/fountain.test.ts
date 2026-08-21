import { describe, it, expect } from 'vitest';
import { FountainEncoder } from './fountainEncoder';
import { FountainDecoder } from './fountainDecoder';
import { PRNG } from './prng';
import { buildRobustSolitonCDF, sampleDegree } from './soliton';

describe('PRNG', () => {
  it('produces deterministic output for the same seed', () => {
    const prng1 = new PRNG(42);
    const prng2 = new PRNG(42);
    for (let i = 0; i < 100; i++) {
      expect(prng1.next()).toBe(prng2.next());
    }
  });

  it('produces different output for different seeds', () => {
    const prng1 = new PRNG(1);
    const prng2 = new PRNG(2);
    const seq1 = Array.from({ length: 10 }, () => prng1.next());
    const seq2 = Array.from({ length: 10 }, () => prng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('nextFloat returns values in [0, 1)', () => {
    const prng = new PRNG(123);
    for (let i = 0; i < 1000; i++) {
      const f = prng.nextFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('nextRange returns values within range', () => {
    const prng = new PRNG(456);
    for (let i = 0; i < 1000; i++) {
      const v = prng.nextRange(5, 15);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(15);
    }
  });

  it('sample returns k distinct indices from [0, n)', () => {
    const prng = new PRNG(789);
    const result = prng.sample(20, 5);
    expect(result.length).toBe(5);
    expect(new Set(result).size).toBe(5);
    for (const idx of result) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(20);
    }
  });

  it('sample(n, n) returns all indices', () => {
    const prng = new PRNG(101);
    const result = prng.sample(5, 5);
    expect(result.length).toBe(5);
    expect(new Set(result).size).toBe(5);
    const sorted = [...result].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('Robust Soliton Distribution', () => {
  it('produces a valid CDF', () => {
    const cdf = buildRobustSolitonCDF(100);
    expect(cdf.length).toBe(101);
    expect(cdf[0]).toBe(0);
    // CDF should be non-decreasing
    for (let i = 2; i <= 100; i++) {
      expect(cdf[i]).toBeGreaterThanOrEqual(cdf[i - 1]);
    }
    expect(cdf[100]).toBeCloseTo(1.0, 10);
  });

  it('sampleDegree returns values in [1, K]', () => {
    const K = 50;
    const cdf = buildRobustSolitonCDF(K);
    const prng = new PRNG(42);
    for (let i = 0; i < 1000; i++) {
      const d = sampleDegree(cdf, prng.nextFloat());
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(K);
    }
  });

  it('heavily favors low degrees', () => {
    const K = 100;
    const cdf = buildRobustSolitonCDF(K);
    const prng = new PRNG(42);
    const counts = new Map<number, number>();
    const N = 10000;
    for (let i = 0; i < N; i++) {
      const d = sampleDegree(cdf, prng.nextFloat());
      counts.set(d, (counts.get(d) || 0) + 1);
    }
    // Degree 1 and 2 should be most common
    const deg1Count = counts.get(1) || 0;
    const deg2Count = counts.get(2) || 0;
    expect(deg1Count + deg2Count).toBeGreaterThan(N * 0.3);
  });
});

describe('FountainEncoder', () => {
  it('splits data into correct number of blocks', () => {
    const data = new Uint8Array(1000);
    const encoder = new FountainEncoder(data, 100);
    expect(encoder.totalBlocks).toBe(10);
    expect(encoder.blockSize).toBe(100);
  });

  it('handles data not evenly divisible by block size', () => {
    const data = new Uint8Array(150);
    const encoder = new FountainEncoder(data, 100);
    expect(encoder.totalBlocks).toBe(2);
  });

  it('generates unique symbols with incrementing seeds', () => {
    const data = new Uint8Array(256);
    for (let i = 0; i < 256; i++) data[i] = i;
    const encoder = new FountainEncoder(data, 64);
    
    const seeds = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const symbol = encoder.nextSymbol();
      expect(symbol.seed).toBe(i + 1);
      expect(symbol.data.length).toBe(64);
      seeds.add(symbol.seed);
    }
    expect(seeds.size).toBe(20);
  });

  it('tracks symbolsGenerated count', () => {
    const data = new Uint8Array(100);
    const encoder = new FountainEncoder(data, 50);
    expect(encoder.symbolsGenerated).toBe(0);
    encoder.nextSymbol();
    expect(encoder.symbolsGenerated).toBe(1);
    encoder.nextSymbol();
    expect(encoder.symbolsGenerated).toBe(2);
  });
});

describe('FountainDecoder', () => {
  it('reports correct initial state', () => {
    const decoder = new FountainDecoder(10, 64);
    expect(decoder.totalBlocks).toBe(10);
    expect(decoder.decodedCount).toBe(0);
    expect(decoder.isComplete).toBe(false);
    expect(decoder.progress).toBe(0);
  });

  it('rejects duplicate symbols', () => {
    const data = new Uint8Array(100);
    const encoder = new FountainEncoder(data, 50);
    const decoder = new FountainDecoder(encoder.totalBlocks, encoder.blockSize);
    
    const symbol = encoder.nextSymbol();
    decoder.addSymbol(symbol.seed, symbol.data);
    const result = decoder.addSymbol(symbol.seed, symbol.data);
    expect(result).toBe(false);
  });
});

describe('Fountain round-trip', () => {
  function runRoundTrip(dataSize: number, blockSize: number) {
    const original = new Uint8Array(dataSize);
    for (let i = 0; i < dataSize; i++) {
      original[i] = i % 256;
    }

    const encoder = new FountainEncoder(original, blockSize);
    const decoder = new FountainDecoder(encoder.totalBlocks, encoder.blockSize);

    let attempts = 0;
    const maxAttempts = Math.max(100, encoder.totalBlocks * 5);
    
    while (!decoder.isComplete && attempts < maxAttempts) {
      const symbol = encoder.nextSymbol();
      decoder.addSymbol(symbol.seed, symbol.data);
      attempts++;
    }

    expect(decoder.isComplete).toBe(true);
    
    const recovered = decoder.getDecodedData(dataSize);
    expect(recovered.length).toBe(dataSize);
    expect(Array.from(recovered)).toEqual(Array.from(original));
    
    return attempts;
  }

  it('encodes and decodes a small file (1 block)', () => {
    runRoundTrip(50, 64);
  });

  it('encodes and decodes a medium file (4 blocks)', () => {
    runRoundTrip(256, 64);
  });

  it('encodes and decodes a larger file (16 blocks)', () => {
    runRoundTrip(1024, 64);
  });

  it('encodes and decodes with non-aligned data (padding)', () => {
    runRoundTrip(150, 64);
  });

  it('encodes and decodes with 100 blocks', () => {
    const attempts = runRoundTrip(6400, 64);
    // Should typically complete within K * 1.5 symbols
    expect(attempts).toBeLessThan(200);
  });

  it('handles order-independent symbol reception', () => {
    const dataSize = 512;
    const blockSize = 64;
    const original = new Uint8Array(dataSize);
    for (let i = 0; i < dataSize; i++) original[i] = (i * 7 + 13) % 256;

    const encoder = new FountainEncoder(original, blockSize);
    
    // Generate many symbols
    const symbols: Array<{ seed: number; data: Uint8Array }> = [];
    const numSymbols = Math.max(100, encoder.totalBlocks * 5);
    for (let i = 0; i < numSymbols; i++) {
      symbols.push(encoder.nextSymbol());
    }

    // Shuffle symbols randomly
    for (let i = symbols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
    }

    const decoder = new FountainDecoder(encoder.totalBlocks, encoder.blockSize);
    for (const symbol of symbols) {
      if (decoder.isComplete) break;
      decoder.addSymbol(symbol.seed, symbol.data);
    }

    expect(decoder.isComplete).toBe(true);
    const recovered = decoder.getDecodedData(dataSize);
    expect(Array.from(recovered)).toEqual(Array.from(original));
  });

  it('handles duplicate symbols gracefully', () => {
    const dataSize = 256;
    const blockSize = 64;
    const original = new Uint8Array(dataSize);
    for (let i = 0; i < dataSize; i++) original[i] = i % 256;

    const encoder = new FountainEncoder(original, blockSize);
    const decoder = new FountainDecoder(encoder.totalBlocks, encoder.blockSize);

    // Feed each symbol twice
    let attempts = 0;
    while (!decoder.isComplete && attempts < 100) {
      const symbol = encoder.nextSymbol();
      decoder.addSymbol(symbol.seed, symbol.data);
      const dup = decoder.addSymbol(symbol.seed, symbol.data);
      expect(dup).toBe(false); // Duplicate should always return false
      attempts++;
    }

    expect(decoder.isComplete).toBe(true);
    const recovered = decoder.getDecodedData(dataSize);
    expect(Array.from(recovered)).toEqual(Array.from(original));
  });

  it('getDecodedData throws when not complete', () => {
    const decoder = new FountainDecoder(10, 64);
    expect(() => decoder.getDecodedData(640)).toThrow('Decoding not complete');
  });
});
