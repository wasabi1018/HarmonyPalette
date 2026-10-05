const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const measurements = JSON.parse(await fs.readFile(path.join(__dirname, "metrics.json"), "utf8"));
  const current = measurements.after.at(-1);
  const source = path.join(__dirname, "03-current.png");
  const metadata = await sharp(source).metadata();
  const height = Math.min(metadata.height, Math.round(current.cropBottom * metadata.width / current.width));
  await sharp(source).extract({ left: 0, top: 0, width: metadata.width, height }).toFile(path.join(__dirname, "intro-refined.png"));
  const background = [255, 250, 253];
  const ink = [62, 53, 64];
  const foreground = ink.map((channel, index) => channel * 0.7 + background[index] * 0.3);
  const luminance = (rgb) => rgb.map(channel => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  console.log(JSON.stringify({ crop: { width: metadata.width, height }, contrast: (luminance(background) + 0.05) / (luminance(foreground) + 0.05) }));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
