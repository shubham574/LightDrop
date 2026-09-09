export async function optimizeImageForTransfer(
  file: File,
  options?: {
    maxDimension?: number;
    quality?: number;
    format?: 'image/webp' | 'image/jpeg';
  }
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const maxDimension = options?.maxDimension ?? 2000;
  const quality = options?.quality ?? 0.85;
  const format = options?.format ?? 'image/webp';

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (error) {
    // If decoding fails, fallback to original
    return file;
  }

  let width = bitmap.width;
  let height = bitmap.height;

  // Only scale DOWN, never up
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  let blob: Blob | null = null;

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    
    try {
      blob = await canvas.convertToBlob({ type: format, quality });
    } catch (err) {
      // Ignore
    }
  } else if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        format,
        quality
      );
    });
  }

  bitmap.close();

  if (!blob || blob.size >= file.size) {
    return file;
  }

  // Adjust filename extension
  const extension = blob.type === 'image/jpeg' ? '.jpg' : '.webp';
  const lastDot = file.name.lastIndexOf('.');
  const nameWithoutExt = lastDot === -1 ? file.name : file.name.slice(0, lastDot);
  const newFilename = `${nameWithoutExt}${extension}`;

  return new File([blob], newFilename, {
    type: blob.type,
    lastModified: file.lastModified,
  });
}
