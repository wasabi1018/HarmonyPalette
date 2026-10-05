const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const rect = JSON.parse(await fs.readFile(path.join(__dirname, 'focus-rect.json'), 'utf8'));
  const input = path.join(__dirname, '390-characters-final.png');
  const metadata = await sharp(input).metadata();
  const scale = metadata.width / rect.width;
  const top = Math.floor(rect.section.y * scale);
  const width = Math.min(metadata.width, Math.floor(rect.section.width * scale));
  const height = Math.min(metadata.height - top, Math.ceil(rect.section.height * scale));
  await sharp(input).extract({left:0,top,width,height}).png().toFile(path.join(__dirname,'fixed-mobile-characters.png'));
  console.log({width,height});
})().catch(error => { console.error(error); process.exitCode=1; });
