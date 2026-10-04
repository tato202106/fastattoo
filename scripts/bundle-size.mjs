// Poids du JS initial d'une page (scripts modules uniquement, hors polyfills noModule).
//   node scripts/bundle-size.mjs [baseUrl] [/chemin ...]
import { brotliCompressSync, gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const base = args[0]?.startsWith("http") ? args.shift() : "http://localhost:3100";
const paths = args.length ? args : ["/", "/explorer", "/tatoueurs/lea-ink", "/pro"];
for (const p of paths) {
  const html = await (await fetch(base + p)).text();
  const srcs = [...html.matchAll(/<script src="(\/_next\/static\/[^"]+\.js)"([^>]*)>/g)].filter((m) => !/noModule/i.test(m[2])).map((m) => m[1]);
  let gz = 0;
  let br = 0;
  for (const src of new Set(srcs)) {
    const buf = Buffer.from(await (await fetch(base + src)).arrayBuffer());
    gz += gzipSync(buf, { level: 9 }).length;
    br += brotliCompressSync(buf).length;
  }
  console.log(`${p.padEnd(22)} gzip ${(gz / 1024).toFixed(0)} kB · brotli ${(br / 1024).toFixed(0)} kB`);
}
