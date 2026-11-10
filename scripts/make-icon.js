// Generates media/icon.png (256x256) with zero dependencies.
// A dark rounded tile with a three-bar "cost" chart: green, amber, red.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 256;

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function roundRectAlpha(x, y, left, top, right, bottom, radius) {
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  const dx = x - cx;
  const dy = y - cy;
  if (dx * dx + dy * dy <= radius * radius) {
    return 1;
  }
  return 0;
}

const pixels = Buffer.alloc(SIZE * SIZE * 4);

const bgTop = [13, 17, 23];
const bgBottom = [22, 30, 42];
const bars = [
  { x: 62, w: 34, h: 74, color: [63, 185, 80] },
  { x: 111, w: 34, h: 130, color: [210, 153, 34] },
  { x: 160, w: 34, h: 96, color: [248, 81, 73] }
];
const baseline = 196;

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const inside = roundRectAlpha(x, y, 8, 8, SIZE - 9, SIZE - 9, 52);
    if (!inside) {
      pixels[i + 3] = 0;
      continue;
    }
    const t = y / SIZE;
    let r = Math.round(bgTop[0] + (bgBottom[0] - bgTop[0]) * t);
    let g = Math.round(bgTop[1] + (bgBottom[1] - bgTop[1]) * t);
    let b = Math.round(bgTop[2] + (bgBottom[2] - bgTop[2]) * t);

    for (const bar of bars) {
      if (x >= bar.x && x < bar.x + bar.w && y >= baseline - bar.h && y < baseline) {
        r = bar.color[0];
        g = bar.color[1];
        b = bar.color[2];
      }
    }

    // Baseline rule.
    if (y >= baseline && y < baseline + 8 && x >= 54 && x < 202) {
      r = 60;
      g = 72;
      b = 88;
    }

    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = 255;
  }
}

// PNG scanlines: one filter byte (0) per row.
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);

const outDir = path.join(__dirname, "..", "media");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "icon.png");
fs.writeFileSync(outFile, png);
console.log("wrote " + outFile + " (" + png.length + " bytes)");
