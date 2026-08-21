export class PRNG {
  private state: number;

  constructor(seed: number) {
    // Ensure non-zero seed for xorshift32
    this.state = (seed >>> 0) || 1;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  nextFloat(): number {
    // Return float in [0, 1) by dividing by max uint32 + 1
    return this.next() / 4294967296;
  }

  nextRange(min: number, max: number): number {
    return min + Math.floor(this.nextFloat() * (max - min));
  }

  sample(n: number, k: number): number[] {
    const indices = Array.from({ length: n }, (_, i) => i);
    const result: number[] = [];
    for (let i = 0; i < k; i++) {
      const j = this.nextRange(i, n);
      // Swap i and j
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
      result.push(indices[i]);
    }
    return result;
  }
}
