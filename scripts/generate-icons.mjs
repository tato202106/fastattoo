// Génère les icônes PWA (PNG) à partir du logo SVG : npm run icons
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const logo = (size, { padding = 0, bg = "#151413", radius = 0.28 } = {}) => {
  const inner = size * (1 - padding * 2);
  const off = size * padding;
  const s = inner / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${padding ? 0 : size * radius}" fill="${bg}"/>
  <g transform="translate(${off} ${off}) scale(${s})">
    <path d="M10 22.5 18.5 9.5l3.5 2.2-8.5 13z" fill="#f8f6f2"/>
    <circle cx="22" cy="21.5" r="3" fill="#d4472a"/>
  </g>
</svg>`;
};

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/favicon.svg", logo(64));
const jobs = [
  ["icon-192.png", logo(192, { radius: 0 })],
  ["icon-512.png", logo(512, { radius: 0 })],
  ["maskable-512.png", logo(512, { padding: 0.12 })],
  ["apple-touch-icon.png", logo(180, { radius: 0 })],
  ["badge-72.png", `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 32 32"><path d="M10 22.5 18.5 9.5l3.5 2.2-8.5 13z" fill="#fff"/><circle cx="22" cy="21.5" r="3" fill="#fff"/></svg>`],
];
for (const [name, svg] of jobs) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`public/icons/${name}`);
}
console.log("Icônes générées dans public/icons");
