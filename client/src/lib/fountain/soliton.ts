export function buildRobustSolitonCDF(K: number, c: number = 0.1, delta: number = 0.5): Float64Array {
  const rho = new Float64Array(K + 1);
  const tau = new Float64Array(K + 1);
  const mu = new Float64Array(K + 1);
  const cdf = new Float64Array(K + 1);

  // Ideal Soliton Distribution
  rho[1] = 1 / K;
  for (let d = 2; d <= K; d++) {
    rho[d] = 1 / (d * (d - 1));
  }

  // Robustness component
  const S = c * Math.log(K / delta) * Math.sqrt(K);
  const limit = Math.floor(K / S);

  for (let d = 1; d <= K; d++) {
    if (d < limit) {
      tau[d] = S / (d * K);
    } else if (d === limit) {
      tau[d] = (S * Math.log(S / delta)) / K;
    } else {
      tau[d] = 0;
    }
  }

  // Combine and normalize
  let sumMu = 0;
  for (let d = 1; d <= K; d++) {
    mu[d] = rho[d] + tau[d];
    sumMu += mu[d];
  }

  let cumulative = 0;
  for (let d = 1; d <= K; d++) {
    mu[d] /= sumMu;
    cumulative += mu[d];
    cdf[d] = cumulative;
  }
  
  // Ensure the last element is exactly 1 due to floating point precision
  cdf[K] = 1.0;

  return cdf;
}

export function sampleDegree(cdf: Float64Array, random: number): number {
  let low = 1;
  let high = cdf.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (random > cdf[mid]) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}
