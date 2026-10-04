/**
 * Générateur procédural de visuels de tatouages (SVG) pour les données de démo.
 *
 * Il remplace des photos réelles tant qu'il n'y a pas de contenu : chaque
 * (style, seed) produit toujours le même dessin, rendu ensuite en AVIF/WebP par
 * sharp (voir app/media/art). Les vraies photos passent par l'upload
 * (lib/storage + app/api/uploads) et le même pipeline de variantes.
 */
import { createRng } from "../random";
import type { StyleSlug } from "../types";

type Rng = ReturnType<typeof createRng>;

export const ART_WIDTH = 1000;
const RATIOS = [4 / 5, 3 / 4, 1, 2 / 3, 4 / 5, 3 / 4] as const;
const SKINS = ["#f1e3d3", "#ead5c0", "#e2c4a8", "#d6b08f", "#c79a76", "#f4ece2", "#efe6da"] as const;

export interface ArtSpec {
  width: number;
  height: number;
  background: string;
}

export function artSpec(style: StyleSlug, seed: number): ArtSpec {
  const rng = createRng(seed * 31 + style.length);
  const ratio = rng.pick(RATIOS);
  return { width: ART_WIDTH, height: Math.round(ART_WIDTH / ratio), background: rng.pick(SKINS) };
}

const INK = "#1b1a19";

export function generateArtSvg(style: StyleSlug, seed: number, outputWidth = ART_WIDTH): string {
  const spec = artSpec(style, seed);
  const rng = createRng(seed * 7919 + style.charCodeAt(0));
  const { width: W, height: H } = spec;
  const body = DRAWERS[style](rng, W, H);
  const outH = Math.round((outputWidth * H) / W);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outH}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="skin" cx="45%" cy="40%" r="80%">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.12"/>
  </radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="blur4"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="bleed"><feGaussianBlur stdDeviation="0.6"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="${spec.background}"/>
<rect width="${W}" height="${H}" fill="url(#skin)"/>
<g filter="url(#bleed)">${body}</g>
</svg>`;
}

const f = (n: number) => n.toFixed(1);

function polar(cx: number, cy: number, r: number, a: number) {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

/** Feuille : deux courbes quadratiques entre la base et la pointe. */
function leafPath(x: number, y: number, angle: number, len: number, wid: number) {
  const [tx, ty] = polar(x, y, len, angle);
  const [mx, my] = polar(x, y, len / 2, angle);
  const [l1x, l1y] = polar(mx, my, wid, angle - Math.PI / 2);
  const [l2x, l2y] = polar(mx, my, wid, angle + Math.PI / 2);
  return `M${f(x)} ${f(y)} Q${f(l1x)} ${f(l1y)} ${f(tx)} ${f(ty)} Q${f(l2x)} ${f(l2y)} ${f(x)} ${f(y)}Z`;
}

function petalPath(cx: number, cy: number, angle: number, r0: number, r1: number, spread: number) {
  const [bx, by] = polar(cx, cy, r0, angle);
  const [tx, ty] = polar(cx, cy, r1, angle);
  const [c1x, c1y] = polar(cx, cy, r1 * 0.95, angle - spread);
  const [c2x, c2y] = polar(cx, cy, r1 * 0.95, angle + spread);
  return `M${f(bx)} ${f(by)} C${f(c1x)} ${f(c1y)} ${f(tx)} ${f(ty)} ${f(tx)} ${f(ty)} C${f(tx)} ${f(ty)} ${f(c2x)} ${f(c2y)} ${f(bx)} ${f(by)}Z`;
}

function fineLine(rng: Rng, W: number, H: number): string {
  const out: string[] = [];
  const stems = rng.int(1, 3);
  for (let s = 0; s < stems; s++) {
    const x0 = W * rng.range(0.38, 0.62) + (s - (stems - 1) / 2) * 90;
    const y0 = H * 0.86;
    const x1 = x0 + rng.range(-160, 160);
    const y1 = H * rng.range(0.14, 0.26);
    const cx = (x0 + x1) / 2 + rng.range(-180, 180);
    const cy = (y0 + y1) / 2;
    out.push(`<path d="M${f(x0)} ${f(y0)} Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
    const leaves = rng.int(6, 11);
    for (let i = 1; i <= leaves; i++) {
      const t = i / (leaves + 1);
      const px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      const side = i % 2 === 0 ? -1 : 1;
      const angle = -Math.PI / 2 + side * rng.range(0.6, 1.1);
      const len = rng.range(50, 95) * (1 - t * 0.4);
      out.push(`<path d="${leafPath(px, py, angle, len, len * 0.28)}" fill="none" stroke="${INK}" stroke-width="2.4"/>`);
    }
    if (rng.chance(0.6)) {
      for (let p = 0; p < 5; p++) {
        out.push(`<path d="${petalPath(x1, y1, (p / 5) * Math.PI * 2 - Math.PI / 2, 4, 46, 0.5)}" fill="none" stroke="${INK}" stroke-width="2.4"/>`);
      }
      out.push(`<circle cx="${f(x1)}" cy="${f(y1)}" r="6" fill="${INK}"/>`);
    }
  }
  for (let d = 0; d < rng.int(3, 8); d++) {
    out.push(`<circle cx="${f(W * rng.range(0.2, 0.8))}" cy="${f(H * rng.range(0.1, 0.9))}" r="${f(rng.range(2, 4))}" fill="${INK}"/>`);
  }
  return out.join("");
}

function floral(rng: Rng, W: number, H: number): string {
  const out: string[] = [];
  const count = rng.int(1, 3);
  for (let c = 0; c < count; c++) {
    const cx = W * (count === 1 ? 0.5 : rng.range(0.3, 0.7));
    const cy = H * (count === 1 ? 0.45 : 0.25 + c * (0.5 / count) + rng.range(0, 0.1));
    const r = (count === 1 ? 250 : 170) * rng.range(0.85, 1.1);
    for (let l = 0; l < 3; l++) {
      const a = rng.range(0, Math.PI * 2);
      const [bx, by] = polar(cx, cy, r * 0.7, a);
      out.push(`<path d="${leafPath(bx, by, a, r * 0.9, r * 0.22)}" fill="#3b4a35" fill-opacity="0.25" stroke="${INK}" stroke-width="4"/>`);
    }
    const layers = rng.int(2, 3);
    for (let layer = layers; layer >= 1; layer--) {
      const n = rng.int(5, 8);
      const offset = rng.range(0, 1);
      for (let p = 0; p < n; p++) {
        const a = ((p + offset) / n) * Math.PI * 2;
        const rr = (r * layer) / layers;
        out.push(`<path d="${petalPath(cx, cy, a, rr * 0.15, rr, 0.42)}" fill="${layer === 1 ? "#2a2726" : "#ffffff"}" fill-opacity="${layer === 1 ? 0.18 : 0.12}" stroke="${INK}" stroke-width="4"/>`);
      }
    }
    for (let d = 0; d < 14; d++) {
      const [dx, dy] = polar(cx, cy, rng.range(4, r * 0.14), rng.range(0, Math.PI * 2));
      out.push(`<circle cx="${f(dx)}" cy="${f(dy)}" r="4" fill="${INK}"/>`);
    }
  }
  return out.join("");
}

function mandala(rng: Rng, W: number, H: number, dots: boolean): string {
  const out: string[] = [];
  const cx = W / 2;
  const cy = H / 2;
  const maxR = Math.min(W, H) * 0.42;
  const rings = rng.int(4, 6);
  for (let i = rings; i >= 1; i--) {
    const r = (maxR * i) / rings;
    const n = 8 + 4 * rng.int(1, 4);
    const kind = rng.int(0, 2);
    for (let p = 0; p < n; p++) {
      const a = (p / n) * Math.PI * 2;
      if (dots) {
        const steps = rng.int(3, 6);
        for (let k = 0; k < steps; k++) {
          const [x, y] = polar(cx, cy, r - k * (maxR / rings / steps), a + (k % 2) * (Math.PI / n));
          out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(6 - k)}" fill="${INK}"/>`);
        }
      } else if (kind === 0) {
        out.push(`<path d="${petalPath(cx, cy, a, r * 0.55, r, Math.PI / n)}" fill="${i % 2 ? INK : "none"}" stroke="${INK}" stroke-width="5"/>`);
      } else if (kind === 1) {
        const [x, y] = polar(cx, cy, r * 0.88, a);
        out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f((r * Math.PI) / n / 2.6)}" fill="${INK}"/>`);
      } else {
        const [x1, y1] = polar(cx, cy, r * 0.62, a);
        const [x2, y2] = polar(cx, cy, r, a + Math.PI / n);
        const [x3, y3] = polar(cx, cy, r * 0.62, a + (2 * Math.PI) / n);
        out.push(`<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)}Z" fill="${INK}"/>`);
      }
    }
    out.push(`<circle cx="${cx}" cy="${cy}" r="${f(r * 0.55)}" fill="none" stroke="${INK}" stroke-width="${dots ? 3 : 6}"/>`);
  }
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f(maxR / rings / 2)}" fill="${INK}"/>`);
  return out.join("");
}

function geometric(rng: Rng, W: number, H: number): string {
  const out: string[] = [];
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) * 0.34;
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f(r)}" fill="none" stroke="${INK}" stroke-width="5"/>`);
  const sides = rng.pick([3, 4, 6] as const);
  for (let k = 0; k < 2; k++) {
    const pts: string[] = [];
    for (let i = 0; i < sides; i++) {
      const [x, y] = polar(cx, cy, r * (k ? 0.62 : 1.18), (i / sides) * Math.PI * 2 - Math.PI / 2 + (k * Math.PI) / sides);
      pts.push(`${f(x)},${f(y)}`);
    }
    out.push(`<polygon points="${pts.join(" ")}" fill="none" stroke="${INK}" stroke-width="${k ? 4 : 5}"/>`);
  }
  // Montagnes dans le cercle
  const base = cy + r * 0.45;
  out.push(`<path d="M${f(cx - r * 0.8)} ${f(base)} L${f(cx - r * 0.25)} ${f(cy - r * 0.35)} L${f(cx + r * 0.05)} ${f(cy + r * 0.05)} L${f(cx + r * 0.35)} ${f(cy - r * 0.2)} L${f(cx + r * 0.8)} ${f(base)}Z" fill="${INK}"/>`);
  out.push(`<circle cx="${f(cx + r * 0.35)}" cy="${f(cy - r * 0.55)}" r="${f(r * 0.1)}" fill="none" stroke="${INK}" stroke-width="4"/>`);
  for (let i = 0; i < 9; i++) {
    out.push(`<line x1="${f(cx - r * 1.6)}" y1="${f(cy + r * 1.25 + i * 12)}" x2="${f(cx + r * 1.6)}" y2="${f(cy + r * 1.25 + i * 12)}" stroke="${INK}" stroke-width="2" opacity="${f(1 - i / 10)}"/>`);
  }
  return out.join("");
}

function minimal(rng: Rng, W: number, H: number): string {
  const cx = W / 2;
  const cy = H / 2;
  const motif = rng.int(0, 3);
  const s = Math.min(W, H) * 0.18;
  switch (motif) {
    case 0: // croissant de lune + étoiles
      return `<path d="M${f(cx + s * 0.2)} ${f(cy - s)} A${f(s)} ${f(s)} 0 1 0 ${f(cx + s * 0.2)} ${f(cy + s)} A${f(s * 0.75)} ${f(s * 0.75)} 0 1 1 ${f(cx + s * 0.2)} ${f(cy - s)}Z" fill="none" stroke="${INK}" stroke-width="4"/>
<path d="M${f(cx + s * 1.1)} ${f(cy - s * 0.6)} l8 18 18 8 -18 8 -8 18 -8 -18 -18 -8 18 -8z" fill="${INK}"/>
<circle cx="${f(cx + s * 0.9)}" cy="${f(cy + s * 0.7)}" r="5" fill="${INK}"/>`;
    case 1: // vague en une ligne
      return `<path d="M${f(cx - s * 1.6)} ${f(cy + s * 0.3)} C${f(cx - s)} ${f(cy - s * 0.8)} ${f(cx - s * 0.2)} ${f(cy + s * 0.9)} ${f(cx + s * 0.4)} ${f(cy - s * 0.2)} S${f(cx + s * 1.2)} ${f(cy - s * 0.6)} ${f(cx + s * 1.6)} ${f(cy + s * 0.1)}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
<circle cx="${f(cx + s * 0.9)}" cy="${f(cy - s * 0.9)}" r="${f(s * 0.22)}" fill="none" stroke="${INK}" stroke-width="4"/>`;
    case 2: // cœur continu
      return `<path d="M${f(cx)} ${f(cy + s * 0.9)} C${f(cx - s * 1.8)} ${f(cy - s * 0.2)} ${f(cx - s * 0.8)} ${f(cy - s * 1.3)} ${f(cx)} ${f(cy - s * 0.35)} C${f(cx + s * 0.8)} ${f(cy - s * 1.3)} ${f(cx + s * 1.8)} ${f(cy - s * 0.2)} ${f(cx)} ${f(cy + s * 0.9)} L${f(cx + s * 1.4)} ${f(cy + s * 0.9)}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    default: // hirondelle stylisée
      return `<path d="M${f(cx - s * 1.4)} ${f(cy - s * 0.4)} Q${f(cx - s * 0.4)} ${f(cy - s * 0.2)} ${f(cx)} ${f(cy + s * 0.1)} Q${f(cx + s * 0.6)} ${f(cy - s * 0.9)} ${f(cx + s * 1.3)} ${f(cy - s * 1)} Q${f(cx + s * 0.8)} ${f(cy - s * 0.2)} ${f(cx + s * 0.4)} ${f(cy + s * 0.3)} L${f(cx + s * 1.1)} ${f(cy + s * 1)} L${f(cx + s * 0.1)} ${f(cy + s * 0.55)} Q${f(cx - s * 0.6)} ${f(cy + s * 0.3)} ${f(cx - s * 1.4)} ${f(cy - s * 0.4)}Z" fill="${INK}"/>`;
  }
}

function realism(rng: Rng, W: number, H: number): string {
  const cx = W / 2;
  const cy = H * rng.range(0.42, 0.5);
  const ew = Math.min(W, H) * 0.42;
  const eh = ew * 0.48;
  const ir = eh * 0.78;
  const id = `ir${Math.round(rng.next() * 1e6)}`;
  const out: string[] = [];
  out.push(`<defs><radialGradient id="${id}"><stop offset="0" stop-color="#111"/><stop offset="0.35" stop-color="#3a3a3a"/><stop offset="0.8" stop-color="#8a8a8a"/><stop offset="1" stop-color="#222"/></radialGradient>
<clipPath id="c${id}"><path d="M${f(cx - ew)} ${f(cy)} Q${f(cx)} ${f(cy - eh * 2)} ${f(cx + ew)} ${f(cy)} Q${f(cx)} ${f(cy + eh * 1.7)} ${f(cx - ew)} ${f(cy)}Z"/></clipPath></defs>`);
  // ombrage autour de l'œil
  out.push(`<ellipse cx="${cx}" cy="${f(cy - eh * 0.2)}" rx="${f(ew * 1.1)}" ry="${f(eh * 1.6)}" fill="#000" opacity="0.13" filter="url(#soft)"/>`);
  out.push(`<path d="M${f(cx - ew * 1.2)} ${f(cy - eh * 1.9)} Q${f(cx)} ${f(cy - eh * 3)} ${f(cx + ew * 1.25)} ${f(cy - eh * 1.7)}" fill="none" stroke="#222" stroke-width="22" stroke-linecap="round" opacity="0.8" filter="url(#blur4)"/>`);
  out.push(`<g clip-path="url(#c${id})"><rect x="${f(cx - ew)}" y="${f(cy - eh * 2)}" width="${f(ew * 2)}" height="${f(eh * 4)}" fill="#efe9e2"/>
<ellipse cx="${cx}" cy="${f(cy - eh * 0.9)}" rx="${f(ew)}" ry="${f(eh * 0.6)}" fill="#000" opacity="0.35" filter="url(#soft)"/>
<circle cx="${cx}" cy="${f(cy - eh * 0.1)}" r="${f(ir)}" fill="url(#${id})"/>`);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const [x1, y1] = polar(cx, cy - eh * 0.1, ir * 0.42, a);
    const [x2, y2] = polar(cx, cy - eh * 0.1, ir * rng.range(0.75, 0.95), a + rng.range(-0.05, 0.05));
    out.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#d9d9d9" stroke-width="1.6" opacity="0.5"/>`);
  }
  out.push(`<circle cx="${cx}" cy="${f(cy - eh * 0.1)}" r="${f(ir * 0.38)}" fill="#050505"/>
<circle cx="${f(cx + ir * 0.28)}" cy="${f(cy - eh * 0.1 - ir * 0.3)}" r="${f(ir * 0.14)}" fill="#fff" opacity="0.95"/></g>`);
  out.push(`<path d="M${f(cx - ew)} ${f(cy)} Q${f(cx)} ${f(cy - eh * 2)} ${f(cx + ew)} ${f(cy)}" fill="none" stroke="${INK}" stroke-width="9"/>`);
  out.push(`<path d="M${f(cx - ew)} ${f(cy)} Q${f(cx)} ${f(cy + eh * 1.7)} ${f(cx + ew)} ${f(cy)}" fill="none" stroke="#4a4a4a" stroke-width="4"/>`);
  for (let i = 0; i < 16; i++) {
    const t = 0.12 + (i / 15) * 0.8;
    const x = (1 - t) ** 2 * (cx - ew) + 2 * (1 - t) * t * cx + t * t * (cx + ew);
    const y = (1 - t) ** 2 * cy + 2 * (1 - t) * t * (cy - eh * 2) + t * t * cy;
    const a = -Math.PI / 2 + (t - 0.5) * 1.6;
    const [lx, ly] = polar(x, y, rng.range(30, 55), a - 0.35);
    out.push(`<path d="M${f(x)} ${f(y)} Q${f((x + lx) / 2 - 6)} ${f((y + ly) / 2)} ${f(lx)} ${f(ly)}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`);
  }
  return out.join("");
}

function japanese(rng: Rng, W: number, H: number): string {
  const out: string[] = [];
  const sunR = Math.min(W, H) * rng.range(0.16, 0.22);
  out.push(`<circle cx="${f(W * rng.range(0.6, 0.72))}" cy="${f(H * 0.26)}" r="${f(sunR)}" fill="#c8322a"/>`);
  const rows = 6;
  const scale = 70;
  for (let r = 0; r < rows; r++) {
    const y = H * 0.5 + r * scale * 0.55;
    for (let x = -scale + (r % 2) * (scale / 2); x < W + scale; x += scale) {
      out.push(`<path d="M${f(x - scale / 2)} ${f(y)} A${f(scale / 2)} ${f(scale / 2)} 0 0 1 ${f(x + scale / 2)} ${f(y)}" fill="#20556b" fill-opacity="${f(0.55 + r * 0.06)}" stroke="${INK}" stroke-width="5"/>`);
      out.push(`<path d="M${f(x - scale / 4)} ${f(y)} A${f(scale / 4)} ${f(scale / 4)} 0 0 1 ${f(x + scale / 4)} ${f(y)}" fill="none" stroke="${INK}" stroke-width="3"/>`);
    }
  }
  // crête de vague
  const cy = H * 0.5;
  const cx = W * rng.range(0.3, 0.42);
  const R = Math.min(W, H) * 0.24;
  out.push(`<path d="M${f(cx - R * 1.8)} ${f(cy)} C${f(cx - R * 1.4)} ${f(cy - R * 1.6)} ${f(cx + R * 0.9)} ${f(cy - R * 1.9)} ${f(cx + R)} ${f(cy - R * 0.6)} C${f(cx + R * 0.6)} ${f(cy - R * 1.1)} ${f(cx - R * 0.1)} ${f(cy - R * 0.7)} ${f(cx + R * 0.2)} ${f(cy)}Z" fill="#20556b" stroke="${INK}" stroke-width="7"/>`);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.75;
    const [x, y] = polar(cx - R * 0.1, cy - R * 0.2, R * 1.25, a);
    out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.11)}" fill="#f6f1e7" stroke="${INK}" stroke-width="4"/>`);
  }
  // pétales de sakura
  for (let p = 0; p < 5; p++) {
    const x = W * rng.range(0.1, 0.9);
    const y = H * rng.range(0.08, 0.4);
    out.push(`<path d="${petalPath(x, y, rng.range(0, 6.28), 2, 28, 0.6)}" fill="#e88aa0" stroke="${INK}" stroke-width="3"/>`);
  }
  return out.join("");
}

function oldSchool(rng: Rng, W: number, H: number): string {
  const cx = W / 2;
  const cy = H * 0.46;
  const s = Math.min(W, H) * 0.3;
  const red = rng.pick(["#c62f2a", "#b8262b", "#d23b2c"] as const);
  const out: string[] = [];
  // dague
  out.push(`<path d="M${f(cx + s * 1.1)} ${f(cy - s * 1.25)} L${f(cx + s * 0.95)} ${f(cy - s * 1.35)} L${f(cx - s * 0.75)} ${f(cy + s * 1.15)} L${f(cx - s * 0.62)} ${f(cy + s * 1.25)}Z" fill="#d9dde0" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`);
  // cœur
  out.push(`<path d="M${f(cx)} ${f(cy + s * 0.95)} C${f(cx - s * 1.5)} ${f(cy + s * 0.05)} ${f(cx - s * 1.2)} ${f(cy - s * 1.05)} ${f(cx)} ${f(cy - s * 0.45)} C${f(cx + s * 1.2)} ${f(cy - s * 1.05)} ${f(cx + s * 1.5)} ${f(cy + s * 0.05)} ${f(cx)} ${f(cy + s * 0.95)}Z" fill="${red}" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>`);
  out.push(`<path d="M${f(cx - s * 0.75)} ${f(cy - s * 0.35)} Q${f(cx - s * 0.6)} ${f(cy - s * 0.75)} ${f(cx - s * 0.25)} ${f(cy - s * 0.55)}" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity="0.85"/>`);
  // garde de la dague devant le cœur
  out.push(`<rect x="${f(cx + s * 0.7)}" y="${f(cy - s * 1.08)}" width="${f(s * 0.55)}" height="${f(s * 0.14)}" rx="8" transform="rotate(-54 ${f(cx + s * 0.97)} ${f(cy - s)})" fill="#e3b33c" stroke="${INK}" stroke-width="8"/>`);
  // banderole
  const by = cy + s * 0.25;
  out.push(`<path d="M${f(cx - s * 1.45)} ${f(by - s * 0.05)} L${f(cx - s * 1.05)} ${f(by - s * 0.12)} L${f(cx - s * 1.05)} ${f(by + s * 0.32)} L${f(cx - s * 1.45)} ${f(by + s * 0.38)} L${f(cx - s * 1.28)} ${f(by + s * 0.16)}Z" fill="#efe1b8" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`);
  out.push(`<path d="M${f(cx + s * 1.45)} ${f(by - s * 0.05)} L${f(cx + s * 1.05)} ${f(by - s * 0.12)} L${f(cx + s * 1.05)} ${f(by + s * 0.32)} L${f(cx + s * 1.45)} ${f(by + s * 0.38)} L${f(cx + s * 1.28)} ${f(by + s * 0.16)}Z" fill="#efe1b8" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`);
  out.push(`<path d="M${f(cx - s * 1.1)} ${f(by - s * 0.2)} Q${f(cx)} ${f(by - s * 0.05)} ${f(cx + s * 1.1)} ${f(by - s * 0.2)} L${f(cx + s * 1.1)} ${f(by + s * 0.24)} Q${f(cx)} ${f(by + s * 0.39)} ${f(cx - s * 1.1)} ${f(by + s * 0.24)}Z" fill="#f6ecd0" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>`);
  out.push(`<path d="M${f(cx - s * 0.75)} ${f(by + s * 0.06)} Q${f(cx)} ${f(by + s * 0.2)} ${f(cx + s * 0.75)} ${f(by + s * 0.06)}" fill="none" stroke="${INK}" stroke-width="7" stroke-dasharray="26 14" stroke-linecap="round"/>`);
  // étoiles
  for (let i = 0; i < 3; i++) {
    const x = W * rng.range(0.12, 0.88);
    const y = H * rng.pick([0.12, 0.84, 0.88] as const);
    const pts: string[] = [];
    for (let k = 0; k < 10; k++) {
      const [px, py] = polar(x, y, k % 2 ? 14 : 34, (k / 10) * Math.PI * 2 - Math.PI / 2);
      pts.push(`${f(px)},${f(py)}`);
    }
    out.push(`<polygon points="${pts.join(" ")}" fill="#e3b33c" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`);
  }
  return out.join("");
}

function watercolor(rng: Rng, W: number, H: number): string {
  const out: string[] = [];
  const palette = rng.pick([
    ["#4fb3bf", "#9b6fd1", "#f08aa2"],
    ["#f2a65a", "#e85d75", "#6c8cd5"],
    ["#57c4a1", "#4f86c6", "#f4d35e"],
  ] as const);
  for (let i = 0; i < 9; i++) {
    out.push(`<ellipse cx="${f(W * rng.range(0.3, 0.7))}" cy="${f(H * rng.range(0.3, 0.7))}" rx="${f(rng.range(70, 190))}" ry="${f(rng.range(60, 170))}" fill="${palette[i % 3]}" opacity="${f(rng.range(0.25, 0.5))}" filter="url(#soft)"/>`);
  }
  for (let i = 0; i < 14; i++) {
    out.push(`<circle cx="${f(W * rng.range(0.2, 0.8))}" cy="${f(H * rng.range(0.2, 0.8))}" r="${f(rng.range(3, 11))}" fill="${palette[i % 3]}" opacity="0.7"/>`);
  }
  // plume en trait fin par-dessus
  const x0 = W * 0.38;
  const y0 = H * 0.82;
  const x1 = W * 0.64;
  const y1 = H * 0.16;
  out.push(`<path d="M${f(x0)} ${f(y0)} Q${f(W * 0.58)} ${f(H * 0.5)} ${f(x1)} ${f(y1)}" fill="none" stroke="${INK}" stroke-width="4"/>`);
  for (let i = 3; i < 26; i++) {
    const t = i / 28;
    const px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * (W * 0.58) + t * t * x1;
    const py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * (H * 0.5) + t * t * y1;
    const len = 110 * Math.sin(Math.PI * t) + 10;
    out.push(`<path d="M${f(px)} ${f(py)} q${f(-len * 0.7)} ${f(-len * 0.1)} ${f(-len)} ${f(len * 0.25)}" fill="none" stroke="${INK}" stroke-width="2"/>`);
    out.push(`<path d="M${f(px)} ${f(py)} q${f(len * 0.7)} ${f(-len * 0.5)} ${f(len)} ${f(-len * 0.2)}" fill="none" stroke="${INK}" stroke-width="2"/>`);
  }
  return out.join("");
}

const DRAWERS: Record<StyleSlug, (rng: Rng, W: number, H: number) => string> = {
  "fine-line": fineLine,
  floral,
  blackwork: (rng, W, H) => mandala(rng, W, H, false),
  dotwork: (rng, W, H) => mandala(rng, W, H, true),
  geometrique: geometric,
  minimaliste: minimal,
  realisme: realism,
  japonais: japanese,
  "old-school": oldSchool,
  aquarelle: watercolor,
};

/** Portrait d'artiste abstrait (silhouette + fond coloré) pour les avatars. */
export function generateAvatarSvg(seed: number, initials: string, outputWidth = 400): string {
  const rng = createRng(seed);
  const hues = ["#2d2a32", "#3a2f2a", "#22313a", "#33292f", "#2b3326", "#402826"] as const;
  const accents = ["#d9482b", "#c99a5b", "#7aa5a0", "#b58db6", "#d3a24a", "#8fa86b"] as const;
  const bg = rng.pick(hues);
  const accent = rng.pick(accents);
  const safe = initials.replace(/[^A-Za-zÀ-ÿ]/g, "").slice(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputWidth}" viewBox="0 0 400 400">
<rect width="400" height="400" fill="${bg}"/>
<circle cx="${f(rng.range(60, 340))}" cy="${f(rng.range(40, 140))}" r="${f(rng.range(90, 150))}" fill="${accent}" opacity="0.35"/>
<text x="200" y="228" text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif" font-size="150" font-weight="700" fill="#f4efe8" opacity="0.92">${safe}</text>
</svg>`;
}
