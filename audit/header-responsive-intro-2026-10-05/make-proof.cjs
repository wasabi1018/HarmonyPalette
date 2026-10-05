const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function crop(input, output, measurement, cssWidth) {
  const source = path.join(__dirname, input);
  const metadata = await sharp(source).metadata();
  const scale = metadata.width / measurement.width;
  const width = cssWidth ? Math.min(metadata.width, Math.round(cssWidth * scale)) : metadata.width;
  const height = Math.min(metadata.height, Math.round(measurement.cropBottom * scale));
  await sharp(source).extract({ left: 0, top: 0, width, height }).toFile(path.join(__dirname, output));
}

async function main() {
  const metrics = JSON.parse(await fs.readFile(path.join(__dirname, "metrics.json"), "utf8"));
  await crop("03-current.png", "mobile-header.png", metrics.at(-1));
  await crop("02-desktop-1280.png", "desktop-header.png", metrics.find(item => item.width === 1280), 620);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
