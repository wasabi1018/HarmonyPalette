export type GreetingType =
  | "お出迎えグリーティング"
  | "はちゃめちゃグリーティング"
  | "ハイタッチグリーティング";

export type ScheduleStatus = "upcoming" | "soon" | "completed";

export type Character = {
  id: string;
  slug: string;
  name: string;
  nameKana: string;
  image: string;
  description: string;
  officialUrl: string;
  isFanStudioRegular: boolean;
  themeColor: string;
  displayOrder?: number;
  birthdayMonth: number | null;
  birthdayDay: number | null;
};

export type GreetingSchedule = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  characterIds: string[];
  title: string;
  greetingType: GreetingType;
  location: string;
  description: string;
  officialUrl: string;
  sourceName: string;
  updatedAt: string;
  status: ScheduleStatus;
};

export type Event = {
  id: string;
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  location: string;
  characterIds: string[];
  image: string;
  description: string;
  officialUrl: string;
  updatedAt: string;
  status: "開催中" | "開催予定" | "終了";
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  releaseDate: string;
  price: string;
  shop: string;
  characterIds: string[];
  image: string;
  description: string;
  officialUrl: string;
  updatedAt: string;
};

export type Spot = {
  id: string;
  slug: string;
  name: string;
  category: string;
  address: string;
  driveTimeMinutes: number;
  image: string;
  description: string;
  childFriendlyInfo: string;
  priceRange: string;
  officialUrl: string;
  bookingUrl: string;
  mapUrl: string;
};
