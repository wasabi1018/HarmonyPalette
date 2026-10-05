const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs/promises');
const dir = __dirname;
const source = path.join(dir, '../top-plan-2026-10-05/option-2-selected.png');
const label = (text, width) => Buffer.from(`<svg width="${width}" height="36"><rect width="100%" height="100%" fill="#fff"/><text x="10" y="25" font-family="Arial, sans-serif" font-size="16" fill="#3e3540">${text}</text></svg>`);
async function pair(file, left, right, width, names) {
  const lm = await sharp(left).metadata(); const rm = await sharp(right).metadata();
  const height = Math.max(lm.height, rm.height) + 44;
  await sharp({ create: { width: width * 2 + 24, height, channels: 3, background: '#fff8fb' } }).composite([
    { input: label(names[0], width), left: 0, top: 0 }, { input: label(names[1], width), left: width + 24, top: 0 },
    { input: left, left: 0, top: 40 }, { input: right, left: width + 24, top: 40 },
  ]).png().toFile(path.join(dir, file));
}
async function main() {
  const sourcePC = await sharp(source).extract({left:52,top:49,width:1021,height:970}).resize({width:640}).png().toBuffer();
  const actualPC = await sharp(path.join(dir,'13-desktop-1024-top.png')).resize({width:640}).png().toBuffer();
  await pair('11-desktop-source-comparison.png', sourcePC, actualPC, 640, ['Selected option 2 - PC','Implementation - PC (approved content changes)']);
  const sourceMobile = await sharp(source).extract({left:1112,top:49,width:373,height:970}).resize({width:375}).png().toBuffer();
  const actualMobile = await sharp(path.join(dir,'02-mobile-top.png')).resize({width:375}).png().toBuffer();
  await pair('12-mobile-source-comparison.png', sourceMobile, actualMobile, 375, ['Selected option 2 - mobile','Implementation - initial viewport']);
  const previewPC = await sharp(path.join(dir,'01-desktop-top.png')).resize({width:640}).png().toBuffer();
  const previewMobile = await sharp(path.join(dir,'02-mobile-top.png')).resize({width:260}).png().toBuffer();
  const pm = await sharp(previewMobile).metadata();
  await sharp({create:{width:924,height:pm.height+44,channels:3,background:'#fff8fb'}}).composite([
    {input:label('TOP - PC',640),left:0,top:0},{input:previewPC,left:0,top:40},
    {input:label('TOP - mobile',260),left:664,top:0},{input:previewMobile,left:664,top:40},
  ]).png().toFile(path.join(dir,'10-top-preview.png'));
  const evidence = [];
  for (const name of ['01-desktop-top.png','02-mobile-top.png','03-mobile-375-top.png','04-mobile-schedule-jump.png','05-guide-cards-desktop.png','06-admin-form-saved-desktop.png','08-admin-form-mobile.png','09-guide-cards-mobile.png','13-desktop-1024-top.png','11-desktop-source-comparison.png','12-mobile-source-comparison.png']) {
    const m = await sharp(path.join(dir,name)).metadata(); evidence.push({file:name,width:m.width,height:m.height});
  }
  await fs.writeFile(path.join(dir,'capture-dimensions.json'), JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
}
main().catch(error => { console.error(error); process.exitCode=1; });
