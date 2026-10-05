const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const metrics = JSON.parse(await fs.readFile(path.join(__dirname, "metrics.json"), "utf8"));
  const current = metrics.at(-1);
  const source = path.join(__dirname, "05-current.png");
  const metadata = await sharp(source).metadata();
  const height = Math.min(metadata.height, Math.round(current.cropBottom * metadata.width / current.width));
  await sharp(source).extract({ left: 0, top: 0, width: metadata.width, height }).toFile(path.join(__dirname, "logo-description.png"));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
