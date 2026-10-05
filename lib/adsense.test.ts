import assert from "node:assert/strict";
import test from "node:test";
import { isAdSenseEligiblePage } from "./adsense";

test("the home page and article details are eligible for Auto Ads", () => {
  assert.equal(isAdSenseEligiblePage("/"), true);
  assert.equal(isAdSenseEligiblePage("/articles/example"), true);
});

test("search and list pages are not eligible, including series lists", () => {
  for (const pathname of [
    "/schedule",
    "/characters",
    "/articles",
    "/articles/",
    "/articles/series",
    "/articles/series/example",
    "/articles/feed.xml",
    "/articles/feed.json",
  ]) {
    assert.equal(isAdSenseEligiblePage(pathname), false, pathname);
  }
});

test("personal, policy, contact, and other pages remain ineligible", () => {
  for (const pathname of ["/plan", "/privacy", "/contact", "/about", "/events"]) {
    assert.equal(isAdSenseEligiblePage(pathname), false, pathname);
  }
});
