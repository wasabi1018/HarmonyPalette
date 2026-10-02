import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Design-only sample data. These values are not crowd or park-operation forecasts.
const statusByDay = new Map([
  [3, "busy"], [4, "busy"], [10, "busy"], [11, "veryBusy"],
  [12, "busy"], [17, "busy"], [18, "veryBusy"], [24, "busy"],
  [25, "veryBusy"], [31, "busy"],
]);
const closedDays = new Set([14]);

const levels = {
  veryBusy: { label: "大混雑", fill: "#F8D9DE", edge: "#D85F70" },
  busy: { label: "混雑", fill: "#FFF0C2", edge: "#BD852B" },
  normal: { label: "普通", fill: "#DDF1F9", edge: "#438EAF" },
  closed: { label: "休園日", fill: "url(#closedHatch)", edge: "#B7AFB7" },
};

const W = 1080;
const H = 1350;
const columns = 7;
const gridX = 56;
const gridY = 538;
const cellW = 138.3;
const cellH = 120;
const font = "'Hiragino Kaku Gothic ProN','Yu Gothic','Meiryo',sans-serif";

function text(x, y, value, size, weight = 700, fill = "#3E3540", extra = "") {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${value}</text>`;
}

function legend(x, level) {
  return `<rect x="${x}" y="307" width="234" height="62" rx="21" fill="#FFFFFF" stroke="#F2DFE7" stroke-width="2"/>
    <rect x="${x + 13}" y="320" width="36" height="36" rx="11" fill="${level.fill}" stroke="${level.edge}" stroke-width="2"/>
    ${text(x + 62, 348, level.label, 24, 900)}`;
}

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
const weekdayHeader = weekdays.map((day, index) => {
  const fill = index === 0 ? "#D85F84" : index === 6 ? "#438EAF" : "#6B6069";
  return text(gridX + index * cellW + cellW / 2, 516, day, 22, 900, fill, 'text-anchor="middle"');
}).join("");

const dates = Array.from({ length: 35 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 8, 27 + i));
  const day = date.getUTCDate();
  const inMonth = date.getUTCMonth() === 9;
  const column = i % columns;
  const row = Math.floor(i / columns);
  const x = gridX + column * cellW;
  const y = gridY + row * cellH;
  if (!inMonth) {
    return `<rect x="${x}" y="${y}" width="134.3" height="116" rx="11" fill="#F8F6F8"/>
      ${text(x + 15, y + 42, day, 29, 800, "#CFC5CD")}`;
  }
  const level = closedDays.has(day) ? levels.closed : levels[statusByDay.get(day) ?? "normal"];
  const dateColor = closedDays.has(day) ? "#817881" : "#3E3540";
  return `<rect x="${x}" y="${y}" width="134.3" height="116" rx="11" fill="${level.fill}"/>
    <rect x="${x + 2}" y="${y + 2}" width="130.3" height="112" rx="9" fill="none" stroke="${level.edge}" stroke-opacity="0.25" stroke-width="2"/>
    ${text(x + 15, y + 51, day, 38, 900, dateColor)}`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="closedHatch" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
      <rect width="16" height="16" fill="#F0EEF1"/>
      <rect width="5" height="16" fill="#DFDAE0"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#FFFAFC"/>
  <circle cx="1039" cy="75" r="178" fill="#FFF0F5"/>
  <circle cx="26" cy="1300" r="126" fill="#F3EFFB"/>
  <rect x="52" y="54" width="46" height="46" rx="15" fill="#EB6E98"/>
  ${text(75, 86, "H", 28, 900, "#FFFFFF", 'text-anchor="middle"')}
  ${text(114, 87, "Harmony", 32, 900)}
  ${text(278, 87, "Palette", 32, 900, "#EB6E98")}
  <rect x="786" y="55" width="244" height="47" rx="24" fill="#FFFFFF"/>
  ${text(908, 85, "DESIGN SAMPLE", 19, 900, "#D65F88", 'text-anchor="middle" letter-spacing="2"')}
  ${text(54, 166, "MONTHLY CROWD FORECAST", 19, 900, "#EB6E98", 'letter-spacing="3"')}
  ${text(52, 238, "2026年10月 混雑予想", 53, 900)}
  ${text(55, 282, "日付ごとの混雑の目安を、ひと目で。", 22, 700, "#766B74")}
  ${legend(54, levels.veryBusy)}
  ${legend(300, levels.busy)}
  ${legend(546, levels.normal)}
  ${legend(792, levels.closed)}
  <rect x="50" y="396" width="980" height="753" rx="30" fill="#FFFFFF" stroke="#F5DDE7" stroke-width="2"/>
  ${text(79, 457, "2026  /  10", 36, 900)}
  ${text(1001, 455, "混雑予想カレンダー", 18, 800, "#887B85", 'text-anchor="end"')}
  <rect x="51" y="475" width="978" height="57" fill="#FFF7FA"/>
  <line x1="51" y1="475" x2="1029" y2="475" stroke="#F6E7ED" stroke-width="2"/>
  <line x1="51" y1="532" x2="1029" y2="532" stroke="#F6E7ED" stroke-width="2"/>
  ${weekdayHeader}
  ${dates}
  ${text(55, 1207, "※ 混雑区分と休園日はデザイン確認用の仮データです。", 21, 700, "#695D67")}
  ${text(55, 1243, "※ 混雑予想は目安です。最新の営業情報もご確認ください。", 20, 700, "#8F838B")}
  <line x1="54" y1="1270" x2="1026" y2="1270" stroke="#F3DFE8" stroke-width="2"/>
  ${text(54, 1307, "Harmony Palette", 25, 900, "#D65F88")}
  ${text(1026, 1307, "CROWD CALENDAR", 18, 800, "#9A8792", 'text-anchor="end" letter-spacing="2"')}
</svg>`;

const outputDir = dirname(fileURLToPath(import.meta.url));
await writeFile(join(outputDir, "crowd-calendar-concept.svg"), svg, "utf8");
await sharp(Buffer.from(svg)).png().toFile(join(outputDir, "crowd-calendar-concept.png"));
