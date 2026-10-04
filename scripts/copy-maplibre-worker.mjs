// MapLibre 6 charge son Web Worker (module ESM) à côté de son bundle. Les
// bundlers ne copient pas ce fichier : on le sert depuis public/, dans un
// dossier versionné (cache immuable), et ArtistMap appelle setWorkerUrl().
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("node_modules/maplibre-gl/package.json", "utf8"));
const dir = `public/vendor/maplibre-${version}`;
mkdirSync(dir, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(`node_modules/maplibre-gl/dist/${f}`, `${dir}/${f}`);
writeFileSync("lib/maplibre-version.ts", `// Généré par scripts/copy-maplibre-worker.mjs — ne pas modifier.\nexport const MAPLIBRE_WORKER_URL = "/vendor/maplibre-${version}/maplibre-gl-worker.mjs";\n`);
console.log(`Worker MapLibre ${version} copié dans ${dir}`);
