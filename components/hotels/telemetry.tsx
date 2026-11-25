"use client";
import { useEffect, useRef } from "react";
import type { HotelEvent } from "@/lib/hotels/events";
import { HOTEL_SOURCES } from "@/lib/hotels/events";

let enabled = false;
const queue: HotelEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
function flush() {
  if (!enabled || !queue.length) return;
  if (timer) clearTimeout(timer);
  timer = undefined;
  const events = queue.splice(0, 40);
  const body = JSON.stringify({ hotelEvents: events });
  if (
    !navigator.sendBeacon?.(
      "/api/analytics/event",
      new Blob([body], { type: "application/json" }),
    )
  )
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  if (queue.length) timer = setTimeout(flush, 1000);
}
export function hotelSource(): HotelEvent["source"] {
  try {
    const s = sessionStorage.getItem("hp:hotel-source");
    if (HOTEL_SOURCES.includes(s as HotelEvent["source"]))
      return s as HotelEvent["source"];
  } catch {}
  try {
    return document.referrer &&
      new URL(document.referrer).origin !== location.origin
      ? "external"
      : "direct";
  } catch {
    return "direct";
  }
}
export function trackHotel(
  event: HotelEvent["event"],
  hotelId = "",
  provider = "",
  placement: HotelEvent["placement"] = "list",
) {
  if (!enabled) return;
  queue.push({ event, hotelId, provider, placement, source: hotelSource() });
  if (queue.length >= 40) flush();
  else if (!timer) timer = setTimeout(flush, 6000);
}
export function HotelTelemetry({ active }: { active: boolean }) {
  useEffect(() => {
    enabled = active;
    const click = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[data-hotel-source]")
          : null;
      if (!link || event.defaultPrevented) return;
      const source = link.dataset.hotelSource as HotelEvent["source"];
      if (!HOTEL_SOURCES.includes(source)) return;
      try {
        sessionStorage.setItem("hp:hotel-source", source);
      } catch {}
      trackHotel("hotel_guide_click", "", "", "cta");
    };
    const hide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    // Capture before Next Link prevents the browser's default navigation.
    document.addEventListener("click", click, true);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      enabled = false;
      document.removeEventListener("click", click, true);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", flush);
    };
  }, [active]);
  return null;
}
export function HotelView({ id = "" }: { id?: string }) {
  const recorded = useRef("");
  useEffect(() => {
    if (recorded.current === (id || "list")) return;
    recorded.current = id || "list";
    trackHotel(
      id ? "hotel_view" : "hotel_list_view",
      id,
      "",
      id ? "detail" : "list",
    );
  }, [id]);
  return null;
}
