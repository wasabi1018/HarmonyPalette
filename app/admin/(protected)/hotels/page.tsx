import type { Metadata } from "next";
import { HotelManager } from "@/components/admin/hotel-manager";
import {
  getHotelMetrics,
  HOTEL_SETUP_ERROR,
  readHotelCatalog,
} from "@/lib/hotels/repository";
export const metadata: Metadata = {
  title: "周辺ホテル管理",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AdminHotelsPage() {
  try {
    const [catalog, metrics] = await Promise.all([
      readHotelCatalog(true),
      getHotelMetrics(),
    ]);
    return <HotelManager initialCatalog={catalog} initialMetrics={metrics} />;
  } catch {
    return (
      <HotelManager
        initialCatalog={{ hotels: [], areas: [], tags: [], available: false }}
        setupError={HOTEL_SETUP_ERROR}
      />
    );
  }
}
