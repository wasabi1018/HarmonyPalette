import { NextResponse } from "next/server";
import { getPublicPlanOptions } from "@/lib/supabase/plan-options-repository";
import { getSupabaseConfigStatus } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!getSupabaseConfigStatus().canRead) {
    return NextResponse.json({ configured: false, attractions: [], facilities: [] });
  }

  try {
    const options = await getPublicPlanOptions();
    return NextResponse.json({
      configured: true,
      attractions: options?.attractions ?? [],
      facilities: options?.facilities ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        attractions: [],
        facilities: [],
        error: error instanceof Error ? error.message : "候補を読み込めませんでした。",
      },
      { status: 500 },
    );
  }
}
