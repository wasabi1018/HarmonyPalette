const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const measurements = JSON.parse(await fs.readFile(path.join(__dirname,'metrics.json'),'utf8'));
  const measurement = measurements.find(item => item.width === 532);
  const input = path.join(__dirname,'532-birthday.png');
  const metadata = await sharp(input).metadata();
  const scale = metadata.width / measurement.width;
  const left = Math.floor(measurement.rect.x * scale);
  const top = Math.floor(measurement.rect.y * scale);
  const width = Math.min(metadata.width - left, Math.floor(measurement.rect.width * scale));
  const height = Math.min(metadata.height - top, Math.ceil(measurement.rect.height * scale));
  await sharp(input).extract({left,top,width,height}).png().toFile(path.join(__dirname,'birthday-decorated.png'));
  console.log({width,height});
})().catch(error => { console.error(error); process.exitCode=1; });
