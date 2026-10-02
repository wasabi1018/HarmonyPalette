import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { CrowdCalendarCard } from "@/components/admin/instagram-crowd-calendar-studio";
import { buildCrowdCalendarMonth } from "@/lib/crowd-calendar";

// Visual QA uses fictitious dates and never reads or writes park data.
const calendar = buildCrowdCalendarMonth(
  "2026-10",
  {
    "2026-10-03": "busy",
    "2026-10-04": "busy",
    "2026-10-11": "veryBusy",
    "2026-10-12": "busy",
    "2026-10-18": "veryBusy",
    "2026-10-24": "busy",
    "2026-10-25": "veryBusy",
  },
  new Set(["2026-10-14"]),
);
if (!calendar) throw new Error("QA用の対象月を生成できませんでした。");

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>混雑予想カレンダー QA</title></head><body style="margin:0;width:1080px">${renderToStaticMarkup(<CrowdCalendarCard calendar={calendar} createdOn="2026-10-02" />)}</body></html>`;
writeFileSync(join(process.cwd(), "audit", "instagram-crowd-calendar-qa.html"), html, "utf8");
