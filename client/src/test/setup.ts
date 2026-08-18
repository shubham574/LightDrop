import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { webcrypto } from 'node:crypto';

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: true,
});

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(100 * 100 * 4),
    width: 100,
    height: 100,
  })),
  canvas: { width: 100, height: 100 },
})) as any;

HTMLVideoElement.prototype.play = vi.fn(() => Promise.resolve());
HTMLVideoElement.prototype.pause = vi.fn();