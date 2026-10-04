import sharp from "sharp";
import { generateArtSvg, generateAvatarSvg } from "../lib/art/generate";
const styles = ["fine-line","floral","blackwork","dotwork","geometrique","minimaliste","realisme","japonais","old-school","aquarelle"] as const;
const tiles: Buffer[] = [];
for (const s of styles) {
  for (const seed of [1, 2]) {
    const svg = generateArtSvg(s, seed, 300);
    tiles.push(await sharp(Buffer.from(svg)).resize(300, 400, { fit: "cover" }).png().toBuffer());
  }
}
tiles.push(await sharp(Buffer.from(generateAvatarSvg(3, "LI", 300))).resize(300,400,{fit:"cover"}).png().toBuffer());
const cols = 7, rows = Math.ceil(tiles.length / cols);
const comp = tiles.map((t, i) => ({ input: t, left: (i % cols) * 300, top: Math.floor(i / cols) * 400 }));
await sharp({ create: { width: cols * 300, height: rows * 400, channels: 3, background: "#fff" } }).composite(comp).png().toFile(process.argv[2]);
console.log("done");
