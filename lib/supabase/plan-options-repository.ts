import "server-only";

import type { PlanAttraction, PlanFacility, PlanOptions } from "@/lib/plan-options";
import { getSupabaseAdminClient, getSupabaseReadClient } from "@/lib/supabase/server";

type PlanOptionRow = {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
};

type PlanAttractionRow = PlanOptionRow & {
  facility_id: string | null;
};

function compareOptions(
  left: { displayOrder: number; name: string },
  right: { displayOrder: number; name: string },
) {
  return left.displayOrder - right.displayOrder || left.name.localeCompare(right.name, "ja");
}

function mapFacility(row: PlanOptionRow): PlanFacility {
  return {
    id: row.id,
    name: row.name,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

function mapAttraction(row: PlanAttractionRow): PlanAttraction {
  return {
    id: row.id,
    name: row.name,
    facilityId: row.facility_id,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

async function readPlanOptions(
  client: NonNullable<ReturnType<typeof getSupabaseReadClient>>,
  activeOnly: boolean,
): Promise<PlanOptions> {
  let facilitiesQuery = client
    .from("plan_facilities")
    .select("id, name, display_order, is_active");
  let attractionsQuery = client
    .from("plan_attractions")
    .select("id, name, facility_id, display_order, is_active");

  if (activeOnly) {
    facilitiesQuery = facilitiesQuery.eq("is_active", true);
    attractionsQuery = attractionsQuery.eq("is_active", true);
  }

  const [facilitiesResult, attractionsResult] = await Promise.all([
    facilitiesQuery,
    attractionsQuery,
  ]);
  if (facilitiesResult.error || attractionsResult.error) {
    throw new Error(
      facilitiesResult.error?.message
      || attractionsResult.error?.message
      || "マイプラン候補の読み込みに失敗しました。",
    );
  }

  return {
    facilities: ((facilitiesResult.data ?? []) as PlanOptionRow[])
      .map(mapFacility)
      .sort(compareOptions),
    attractions: ((attractionsResult.data ?? []) as PlanAttractionRow[])
      .map(mapAttraction)
      .sort(compareOptions),
  };
}

export async function getPublicPlanOptions(): Promise<PlanOptions | null> {
  const client = getSupabaseReadClient();
  return client ? readPlanOptions(client, true) : null;
}

export async function getAdminPlanOptions(): Promise<PlanOptions | null> {
  const client = getSupabaseAdminClient();
  return client ? readPlanOptions(client, false) : null;
}
