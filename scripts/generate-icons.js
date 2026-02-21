/**
 * Generate 16x16, 48x48, 128x128 PNG icons for CookieControl (Node, no deps).
 * Run: node scripts/generate-icons.js
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let crc = -1;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function makePNG(size, r, g, b) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rowLen = 1 + size * 3;
  const raw = Buffer.alloc(size * rowLen);
  let pos = 0;
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.4;
  for (let y = 0; y < size; y++) {
    raw[pos++] = 0;
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / radius;
      const dy = (y - cy) / radius;
      const d = dx * dx + dy * dy;
      const inCircle = d <= 1.1;
      const inBite = size >= 16 && (x < cx * 0.6 && y > cy * 0.7);
      const useFg = inCircle && !inBite;
      raw[pos++] = useFg ? r : 240;
      raw[pos++] = useFg ? g : 235;
      raw[pos++] = useFg ? b : 230;
    }
  }
  const idat = makeChunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

const outDir = path.join(__dirname, '..', 'ui', 'icons');
const tan = { r: 180, g: 140, b: 90 };
fs.writeFileSync(path.join(outDir, 'icon16.png'), makePNG(16, tan.r, tan.g, tan.b));
fs.writeFileSync(path.join(outDir, 'icon48.png'), makePNG(48, tan.r, tan.g, tan.b));
fs.writeFileSync(path.join(outDir, 'icon128.png'), makePNG(128, tan.r, tan.g, tan.b));
console.log('Icons written to ui/icons/');
