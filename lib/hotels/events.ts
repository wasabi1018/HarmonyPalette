export const HOTEL_EVENTS = [
  "hotel_list_view",
  "hotel_view",
  "booking_click",
  "hotel_guide_click",
  "pr_impression",
  "pr_click",
] as const;
export const HOTEL_SOURCES = [
  "direct",
  "external",
  "home",
  "crowd",
  "plan",
  "article",
  "navigation",
  "list",
  "detail",
] as const;
export type HotelEvent = {
  event: (typeof HOTEL_EVENTS)[number];
  hotelId: string;
  provider: string;
  source: (typeof HOTEL_SOURCES)[number];
  placement: "list" | "detail" | "pr" | "cta";
};
export function parseHotelEvents(value: unknown): HotelEvent[] {
  if (!Array.isArray(value) || !value.length || value.length > 40)
    throw new Error("Invalid events");
  return value.map((v) => {
    if (
      !v ||
      typeof v !== "object" ||
      !HOTEL_EVENTS.includes(v.event) ||
      !HOTEL_SOURCES.includes(v.source) ||
      !["list", "detail", "pr", "cta"].includes(v.placement) ||
      typeof v.hotelId !== "string" ||
      (v.hotelId && !/^[a-f0-9-]{36}$/i.test(v.hotelId)) ||
      typeof v.provider !== "string" ||
      !/^[a-z0-9-]{0,50}$/.test(v.provider)
    )
      throw new Error("Invalid event");
    return {
      event: v.event,
      hotelId: v.hotelId,
      provider: v.provider,
      source: v.source,
      placement: v.placement,
    };
  });
}
