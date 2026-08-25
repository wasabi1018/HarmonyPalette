import assert from "node:assert/strict";
import test from "node:test";
import { isAdSenseEligiblePage } from "./adsense";

test("content pages and the base schedule page are eligible for Auto Ads", () => {
  assert.equal(isAdSenseEligiblePage("/", new URLSearchParams()), true);
  assert.equal(isAdSenseEligiblePage("/articles/example", new URLSearchParams()), true);
  assert.equal(isAdSenseEligiblePage("/guide", new URLSearchParams()), true);
  assert.equal(isAdSenseEligiblePage("/characters", new URLSearchParams()), true);
  assert.equal(isAdSenseEligiblePage("/schedule", new URLSearchParams()), true);
});

test("personal, policy, contact, and filtered schedule pages are not eligible", () => {
  assert.equal(isAdSenseEligiblePage("/plan", new URLSearchParams()), false);
  assert.equal(isAdSenseEligiblePage("/privacy", new URLSearchParams()), false);
  assert.equal(isAdSenseEligiblePage("/contact", new URLSearchParams()), false);
  assert.equal(isAdSenseEligiblePage("/about", new URLSearchParams()), false);
  assert.equal(isAdSenseEligiblePage("/events", new URLSearchParams()), false);
  assert.equal(isAdSenseEligiblePage("/schedule", new URLSearchParams("character=ハローキティ")), false);
  assert.equal(isAdSenseEligiblePage("/schedule", new URLSearchParams("from=2026-08-25&to=2026-09-01")), false);
});
