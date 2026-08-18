import { writeFileSync } from 'fs';
import { createCanvas } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sizes = [192, 512];

function generateIcons() {
  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.125);
    ctx.fill();
    
    const moduleSize = size / 512;
    
    // QR-like pattern
    ctx.fillStyle = '#00ff88';
    const modules = [
      [96, 96], [192, 96], [288, 96],
      [96, 192], [288, 192],
      [96, 288], [192, 288], [288, 288]
    ];
    
    for (const [x, y] of modules) {
      ctx.fillRect(x * moduleSize, y * moduleSize, 64 * moduleSize, 64 * moduleSize);
    }
    
    // Center glow
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 48 * moduleSize, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
    ctx.fill();
    
    // Arrow
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 16 * moduleSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(192 * moduleSize, 256 * moduleSize);
    ctx.lineTo(256 * moduleSize, 320 * moduleSize);
    ctx.lineTo(320 * moduleSize, 192 * moduleSize);
    ctx.stroke();
    
    const buffer = canvas.toBuffer('image/png');
    writeFileSync(join(__dirname, '..', 'public', `icon-${size}.png`), buffer);
    console.log(`Generated icon-${size}.png`);
  }
}

generateIcons();