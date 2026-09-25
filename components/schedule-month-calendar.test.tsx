import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScheduleMonthCalendar } from "@/components/schedule-month-calendar";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("SSRで同じ月のカレンダーを二重出力しない", () => {
  const html = renderToStaticMarkup(
    createElement(ScheduleMonthCalendar, {
      fromDate: "2026-09-01",
      toDate: "2026-10-31",
      entries: [],
      birthdays: [],
      operatingDays: [],
      today: "2026-09-25",
      onSelectDate: () => undefined,
    }),
  );

  assert.equal(html.match(/aria-label="2026年9月のカレンダー"/g)?.length, 1);
  assert.equal(html.match(/aria-label="2026年10月のカレンダー"/g)?.length, 1);
});
