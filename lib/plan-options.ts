export const CUSTOM_PLAN_COLORS = [
  { id: "green", label: "グリーン", value: "#53a687" },
  { id: "blue", label: "ブルー", value: "#5f9fd0" },
  { id: "purple", label: "パープル", value: "#9b82c4" },
  { id: "orange", label: "オレンジ", value: "#dc9544" },
  { id: "navy", label: "ネイビー", value: "#667d9f" },
] as const;

export type CustomPlanColor = (typeof CUSTOM_PLAN_COLORS)[number]["id"];

export const DEFAULT_CUSTOM_PLAN_COLOR: CustomPlanColor = "green";

export type PlanFacility = {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

export type PlanAttraction = {
  id: string;
  name: string;
  facilityId: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type PlanOptions = {
  attractions: PlanAttraction[];
  facilities: PlanFacility[];
};

export function isCustomPlanColor(value: unknown): value is CustomPlanColor {
  return CUSTOM_PLAN_COLORS.some((color) => color.id === value);
}

export function getCustomPlanColorValue(color: CustomPlanColor | undefined) {
  return CUSTOM_PLAN_COLORS.find((option) => option.id === color)?.value
    ?? CUSTOM_PLAN_COLORS[0].value;
}
