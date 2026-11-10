// Generates media/icon.png (512x512) with zero dependencies.
// Design: dark rounded tile, a three-bar cost chart (green -> amber -> red)
// with a soft red glow behind the tallest bar. Rendered at 4x and box-filtered
// down so the curves and bar corners are properly anti-aliased.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 512;
const SS = 4; // supersampling factor
const W = SIZE * SS;

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

function inRoundedRect(x, y, left, top, right, bottom, radius) {
  const rad = Math.max(0, Math.min(radius, (right - left) / 2, (bottom - top) / 2));
  const cx = Math.min(Math.max(x, left + rad), right - rad);
  const cy = Math.min(Math.max(y, top + rad), bottom - rad);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= rad * rad;
}

// Straight-alpha RGBA buffer, drawn in normalized 0..1 coordinates scaled to W.
const buf = new Float32Array(W * W * 4);

function blend(x, y, color, alpha) {
  if (alpha <= 0) {
    return;
  }
  const i = (y * W + x) * 4;
  const a = Math.min(1, alpha);
  const dstA = buf[i + 3];
  const outA = a + dstA * (1 - a);
  if (outA <= 0) {
    return;
  }
  for (let c = 0; c < 3; c++) {
    buf[i + c] = (color[c] * a + buf[i + c] * dstA * (1 - a)) / outA;
  }
  buf[i + 3] = outA;
}

const SX = (v) => v * W; // normalized -> supersampled px

const TILE = { l: 0.055, t: 0.055, r: 0.945, b: 0.945, rad: 0.215 };
const topColor = [11, 16, 28];
const bottomColor = [19, 28, 45];

const BASELINE = 0.82;
const bars = [
  { x: 0.20, w: 0.14, h: 0.300, color: [63, 185, 80] },
  { x: 0.43, w: 0.14, h: 0.500, color: [217, 163, 37] },
  { x: 0.66, w: 0.14, h: 0.380, color: [248, 81, 73] }
];

for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const nx = (x + 0.5) / W;
    const ny = (y + 0.5) / W;

    if (!inRoundedRect(nx, ny, TILE.l, TILE.t, TILE.r, TILE.b, TILE.rad)) {
      continue;
    }

    // Vertical gradient.
    const t = (ny - TILE.t) / (TILE.b - TILE.t);
    const base = [
      topColor[0] + (bottomColor[0] - topColor[0]) * t,
      topColor[1] + (bottomColor[1] - topColor[1]) * t,
      topColor[2] + (bottomColor[2] - topColor[2]) * t
    ];
    blend(x, y, base, 1);

    // Soft top-left highlight so the tile does not look flat.
    const hx = (nx - 0.22) / 0.55;
    const hy = (ny - 0.12) / 0.55;
    const highlight = Math.max(0, 1 - Math.sqrt(hx * hx + hy * hy));
    if (highlight > 0) {
      blend(x, y, [70, 95, 140], 0.16 * highlight * highlight);
    }
  }
}

// Red glow behind the tallest bar.
const redBar = bars[2];
const glowX = redBar.x + redBar.w / 2;
const glowY = BASELINE - redBar.h / 2;
const glowR = 0.44;
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const nx = (x + 0.5) / W;
    const ny = (y + 0.5) / W;
    if (!inRoundedRect(nx, ny, TILE.l, TILE.t, TILE.r, TILE.b, TILE.rad)) {
      continue;
    }
    const dx = nx - glowX;
    const dy = ny - glowY;
    const d = Math.sqrt(dx * dx + dy * dy) / glowR;
    if (d < 1) {
      const falloff = (1 - d) * (1 - d);
      blend(x, y, [248, 81, 73], 0.26 * falloff);
    }
  }
}

// Baseline rule.
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const nx = (x + 0.5) / W;
    const ny = (y + 0.5) / W;
    if (inRoundedRect(nx, ny, 0.165, BASELINE, 0.835, BASELINE + 0.024, 0.012)) {
      blend(x, y, [58, 73, 96], 0.95);
    }
  }
}

// Bars, bottom-anchored on the baseline, with rounded caps.
const barRadius = 0.028;
for (const bar of bars) {
  const left = bar.x;
  const right = bar.x + bar.w;
  const top = BASELINE - bar.h;
  const bottom = BASELINE - 0.004;
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x + 0.5) / W;
      const ny = (y + 0.5) / W;
      if (!inRoundedRect(nx, ny, left, top, right, bottom, barRadius)) {
        continue;
      }
      // Subtle vertical shading inside each bar.
      const bt = (ny - top) / (bottom - top);
      const shade = 1 + (1 - bt) * 0.12;
      blend(x, y, [
        Math.min(255, bar.color[0] * shade),
        Math.min(255, bar.color[1] * shade),
        Math.min(255, bar.color[2] * shade)
      ], 1);
    }
  }
}

// Box-filter down to SIZE with premultiplied alpha (avoids dark fringes).
const out = Buffer.alloc(SIZE * SIZE * 4);
const area = SS * SS;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
        const sa = buf[i + 3];
        r += buf[i] * sa;
        g += buf[i + 1] * sa;
        b += buf[i + 2] * sa;
        a += sa;
      }
    }
    const o = (y * SIZE + x) * 4;
    if (a > 0) {
      out[o] = Math.round(Math.min(255, r / a));
      out[o + 1] = Math.round(Math.min(255, g / a));
      out[o + 2] = Math.round(Math.min(255, b / a));
    }
    out[o + 3] = Math.round((a / area) * 255);
  }
}

// PNG rows: one filter byte (0) per scanline.
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  out.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
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
console.log("wrote " + outFile + " (" + SIZE + "x" + SIZE + ", " + png.length + " bytes)");
