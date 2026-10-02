// Génère les icônes PNG de l'app (sans dépendance) : même dessin que public/favicon.svg.
// Usage : npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const GREEN = [0x2f, 0x5d, 0x50];
const WHITE = [0xff, 0xff, 0xff];
const GOLD = [0xe0, 0xa4, 0x3a];

// Rectangle à coins arrondis, coordonnées dans un repère 64×64.
function inRoundRect(x, y, rx, ry, w, h, r) {
  if (x < rx || y < ry || x > rx + w || y > ry + h) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + w - r);
  const cy = Math.min(Math.max(y, ry + r), ry + h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function pixel(u, v, maskable) {
  // Version "maskable" : dessin réduit pour rester dans la zone de sécurité, fond plein.
  const s = maskable ? 0.72 : 1;
  const x = (u - 32) / s + 32;
  const y = (v - 32) / s + 32;
  if (!maskable && !inRoundRect(u, v, 0, 0, 64, 64, 14)) return null;
  if ((x - 44) ** 2 + (y - 46) ** 2 <= 64) return GOLD;
  if (inRoundRect(x, y, 23, 20, 18, 3, 1.5) || inRoundRect(x, y, 23, 28, 18, 3, 1.5) || inRoundRect(x, y, 23, 36, 12, 3, 1.5)) return GREEN;
  if (inRoundRect(x, y, 18, 12, 28, 40, 3)) return WHITE;
  return GREEN;
}

function png(size, maskable = false, opaque = false) {
  const SS = 4; // suréchantillonnage pour l'anticrénelage
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let j = 0; j < size; j++) {
    raw[j * (size * 4 + 1)] = 0;
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) {
        const c = pixel(((i + (si + 0.5) / SS) / size) * 64, ((j + (sj + 0.5) / SS) / size) * 64, maskable);
        const col = c ?? (opaque ? GREEN : null);
        if (col) { r += col[0]; g += col[1]; b += col[2]; a += 255; }
      }
      const n = SS * SS, k = a / 255 || 1, o = j * (size * 4 + 1) + 1 + i * 4;
      raw[o] = r / k; raw[o + 1] = g / k; raw[o + 2] = b / k; raw[o + 3] = a / n;
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync('public/icons/icon-192.png', png(192));
writeFileSync('public/icons/icon-512.png', png(512));
writeFileSync('public/icons/icon-512-maskable.png', png(512, true));
// iOS applique ses propres coins arrondis : l'icône doit être opaque et pleine.
writeFileSync('public/icons/apple-touch-icon.png', png(180, true, true));
console.log('Icônes générées dans public/icons/');
