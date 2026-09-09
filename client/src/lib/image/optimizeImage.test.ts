import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizeImageForTransfer } from './optimizeImage';

describe('optimizeImageForTransfer', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should return original file if not an image', async () => {
    const file = new File(['text content'], 'doc.txt', { type: 'text/plain' });
    const result = await optimizeImageForTransfer(file);
    expect(result).toBe(file);
  });

  it('should return original file if optimized blob is larger', async () => {
    const file = new File(['small image content'], 'photo.png', { type: 'image/png' });
    
    // Mock createImageBitmap to return a small bitmap
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 500,
      height: 300,
      close: vi.fn(),
    }));

    // Mock OffscreenCanvas
    const mockContext = { drawImage: vi.fn() };
    const mockConvertToBlob = vi.fn().mockResolvedValue(new Blob(['larger content than original file'], { type: 'image/webp' }));
    
    class MockOffscreenCanvas {
      constructor(width: number, height: number) {}
      getContext() { return mockContext; }
      convertToBlob = mockConvertToBlob;
    }
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

    const result = await optimizeImageForTransfer(file);
    
    expect(result).toBe(file);
  });

  it('should return optimized file if smaller', async () => {
    // Create a large file
    const largeContent = new Array(1000).fill('large image content').join('');
    const file = new File([largeContent], 'photo.png', { type: 'image/png', lastModified: 123456789 });
    
    // Mock createImageBitmap to return a large bitmap
    const closeMock = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      width: 4000,
      height: 3000,
      close: closeMock,
    }));

    // Mock OffscreenCanvas to return a small blob
    const mockContext = { drawImage: vi.fn() };
    const smallBlob = new Blob(['small'], { type: 'image/webp' });
    const mockConvertToBlob = vi.fn().mockResolvedValue(smallBlob);
    
    let canvasWidth = 0;
    let canvasHeight = 0;
    
    class MockOffscreenCanvas {
      constructor(width: number, height: number) {
        canvasWidth = width;
        canvasHeight = height;
      }
      getContext() { return mockContext; }
      convertToBlob = mockConvertToBlob;
    }
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

    const result = await optimizeImageForTransfer(file, { maxDimension: 2000 });
    
    expect(result).not.toBe(file);
    expect(result.size).toBe(smallBlob.size);
    expect(result.name).toBe('photo.webp');
    expect(result.type).toBe('image/webp');
    expect(result.lastModified).toBe(123456789);
    
    // Check scaling logic: 4000x3000 -> 2000x1500
    expect(canvasWidth).toBe(2000);
    expect(canvasHeight).toBe(1500);
    expect(closeMock).toHaveBeenCalled();
  });
});
