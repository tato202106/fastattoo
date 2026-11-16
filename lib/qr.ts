/**
 * Générateur de QR code (mode octets, correction d'erreur « M », versions 1 à 10).
 * Suffisant pour une adresse de profil (jusqu'à 213 octets) et sans dépendance.
 * Algorithme d'après la norme ISO/IEC 18004 (implémentation de référence de Nayuki).
 */

/** Matrice carrée : true = module noir. */
export type QrMatrix = boolean[][];

// Version 1 → 10, niveau M : codes correcteurs par bloc et nombre de blocs.
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const MAX_VERSION = 10;
const FORMAT_ECC_M = 0; // bits du niveau M dans l'information de format

function rawModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    result -= (25 * n - 10) * n - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(ver: number): number {
  return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver]! * NUM_BLOCKS[ver]!;
}

/** Nombre maximal d'octets encodables pour une version. */
export function qrCapacity(ver: number): number {
  const bits = dataCodewords(ver) * 8 - 4 - (ver < 10 ? 8 : 16);
  return Math.floor(bits / 8);
}

/* ---------- Reed-Solomon sur GF(256) ---------- */

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j]!, root);
      if (j + 1 < degree) result[j] = result[j]! ^ result[j + 1]!;
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ result.shift()!;
    result.push(0);
    divisor.forEach((coef, i) => (result[i] = result[i]! ^ gfMul(coef, factor)));
  }
  return result;
}

/* ---------- Construction ---------- */

function encodeData(bytes: Uint8Array, ver: number): number[] {
  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  push(0b0100, 4); // mode octets
  push(bytes.length, ver < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const capacityBits = dataCodewords(ver) * 8;
  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) push(pad, 8);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0));
  return out;
}

function addEcc(data: number[], ver: number): number[] {
  const numBlocks = NUM_BLOCKS[ver]!;
  const eccLen = ECC_PER_BLOCK[ver]!;
  const rawCodewords = Math.floor(rawModules(ver) / 8);
  const numShort = numBlocks - (rawCodewords % numBlocks);
  const shortLen = Math.floor(rawCodewords / numBlocks);
  const divisor = rsDivisor(eccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, divisor);
    if (i < numShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const result: number[] = [];
  for (let i = 0; i < blocks[0]!.length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLen - eccLen || j >= numShort) result.push(block[i]!);
    });
  }
  return result;
}

function alignmentPositions(ver: number): number[] {
  if (ver === 1) return [];
  const num = Math.floor(ver / 7) + 2;
  const step = Math.floor((ver * 8 + num * 3 + 5) / (num * 4 - 4)) * 2;
  const result = [6];
  for (let pos = ver * 4 + 17 - 7; result.length < num; pos -= step) result.splice(1, 0, pos);
  return result;
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

class Builder {
  readonly ver: number;
  readonly size: number;
  readonly modules: boolean[][];
  readonly fixed: boolean[][];

  constructor(ver: number) {
    this.ver = ver;
    this.size = ver * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.fixed = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.drawFunctionPatterns();
  }

  private set(x: number, y: number, dark: boolean) {
    this.modules[y]![x] = dark;
    this.fixed[y]![x] = true;
  }

  private drawFunctionPatterns() {
    const { size } = this;
    for (let i = 0; i < size; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    this.finder(3, 3);
    this.finder(size - 4, 3);
    this.finder(3, size - 4);
    const pos = alignmentPositions(this.ver);
    const n = pos.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0))) this.alignment(pos[i]!, pos[j]!);
      }
    }
    this.drawFormat(0); // réserve les emplacements, réécrit après le choix du masque
    this.drawVersion();
  }

  private finder(cx: number, cy: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < this.size && y >= 0 && y < this.size) this.set(x, y, dist !== 2 && dist !== 4);
      }
    }
  }

  private alignment(cx: number, cy: number) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }

  drawFormat(mask: number) {
    const data = (FORMAT_ECC_M << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) !== 0;
    const { size } = this;
    for (let i = 0; i <= 5; i++) this.set(8, i, bit(i));
    this.set(8, 7, bit(6));
    this.set(8, 8, bit(7));
    this.set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) this.set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.set(8, size - 15 + i, bit(i));
    this.set(8, size - 8, true);
  }

  private drawVersion() {
    if (this.ver < 7) return;
    let rem = this.ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.set(a, b, dark);
      this.set(b, a, dark);
    }
  }

  drawCodewords(codewords: number[]) {
    const { size } = this;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!this.fixed[y]![x] && i < codewords.length * 8) {
            this.modules[y]![x] = ((codewords[i >>> 3]! >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
  }

  applyMask(mask: number) {
    const fn = MASKS[mask]!;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) if (!this.fixed[y]![x] && fn(x, y)) this.modules[y]![x] = !this.modules[y]![x];
    }
  }

  penalty(): number {
    const { size, modules } = this;
    let result = 0;
    const lineScore = (get: (i: number) => boolean) => {
      let score = 0;
      let runColor = false;
      let runLen = 0;
      const line: boolean[] = [];
      for (let i = 0; i < size; i++) {
        const c = get(i);
        line.push(c);
        if (c === runColor) runLen++;
        else {
          if (runLen >= 5) score += runLen - 2;
          runColor = c;
          runLen = 1;
        }
      }
      if (runLen >= 5) score += runLen - 2;
      // Motifs ressemblant à un repère (1:1:3:1:1 bordé de blanc).
      const padded = [false, false, false, false, ...line, false, false, false, false];
      for (let i = 0; i + 11 <= padded.length; i++) {
        const w = padded.slice(i, i + 11).map((b) => (b ? 1 : 0)).join("");
        if (w === "10111010000" || w === "00001011101") score += 40;
      }
      return score;
    };
    for (let y = 0; y < size; y++) result += lineScore((i) => modules[y]![i]!);
    for (let x = 0; x < size; x++) result += lineScore((i) => modules[i]![x]!);
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = modules[y]![x];
        if (c === modules[y]![x + 1] && c === modules[y + 1]![x] && c === modules[y + 1]![x + 1]) result += 3;
      }
    }
    let dark = 0;
    for (const row of modules) for (const c of row) if (c) dark++;
    const total = size * size;
    result += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return result;
  }
}

/** Encode un texte (UTF-8) en QR code. Lève une erreur s'il est trop long. */
export function encodeQr(text: string): QrMatrix {
  const bytes = new TextEncoder().encode(text);
  let ver = 1;
  while (ver <= MAX_VERSION && qrCapacity(ver) < bytes.length) ver++;
  if (ver > MAX_VERSION) throw new Error("Texte trop long pour le QR code");
  const codewords = addEcc(encodeData(bytes, ver), ver);

  let best: Builder | null = null;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const b = new Builder(ver);
    b.drawCodewords(codewords);
    b.applyMask(mask);
    b.drawFormat(mask);
    const p = b.penalty();
    if (p < bestPenalty) {
      best = b;
      bestPenalty = p;
    }
  }
  return best!.modules;
}

/** Chemin SVG des modules noirs (1 unité = 1 module), décalé de `margin` modules. */
export function qrPath(matrix: QrMatrix, margin = 0): string {
  const parts: string[] = [];
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x++;
      parts.push(`M${start + margin} ${y + margin}h${x - start}v1h${start - x}z`);
    }
  });
  return parts.join("");
}

/** SVG autonome du QR code (fond blanc, marge réglementaire de 4 modules). */
export function qrSvg(text: string, { color = "#151413", margin = 4 }: { color?: string; margin?: number } = {}): string {
  const matrix = encodeQr(text);
  const size = matrix.length + margin * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/><path d="${qrPath(matrix, margin)}" fill="${color}"/></svg>`
  );
}
