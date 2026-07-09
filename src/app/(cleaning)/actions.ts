"use server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServerClient } from "@/lib/supabase/server";
import { getApartmentNameMap } from "@/lib/pricing-data";

export type CleaningBooking = {
  id: string;
  apartment_id: string;
  apartment_name: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  infants: number;
  dogs: number;
  cleaning_note: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  status: string;
};

export async function getCleaningBookings(): Promise<CleaningBooking[]> {
  const supabase = createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Auth-Check: aktives cleaning_profile ODER Admin (Admins dürfen das Portal sehen)
  const { data: profile } = await supabase
    .from("cleaning_profiles")
    .select("id, active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.active) {
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();
    if (!adminProfile) throw new Error("Forbidden");
  }

  // Anonymisierte View via Service-Role lesen (Zugriffskontrolle ist oben app-seitig
  // erfolgt). So bleibt die View auf security_invoker=on und umgeht keine RLS mehr.
  const service = createServerClient();
  const { data, error } = await service
    .from("cleaning_bookings")
    .select(
      "id, apartment_id, check_in, check_out, adults, children, infants, dogs, cleaning_note, arrival_time, departure_time, status"
    )
    .order("check_out", { ascending: true });

  if (error) {
    console.error("getCleaningBookings:", error);
    return [];
  }

  const nameMap = await getApartmentNameMap();
  return (data ?? []).map((b) => ({
    id: b.id as string,
    apartment_id: b.apartment_id as string,
    apartment_name: nameMap.get(b.apartment_id as string) ?? (b.apartment_id as string),
    check_in: b.check_in as string,
    check_out: b.check_out as string,
    adults: Number(b.adults || 0),
    children: Number(b.children || 0),
    infants: Number(b.infants || 0),
    dogs: Number(b.dogs || 0),
    cleaning_note: (b.cleaning_note as string | null) ?? null,
    arrival_time: (b.arrival_time as string | null) ?? null,
    departure_time: (b.departure_time as string | null) ?? null,
    status: b.status as string,
  }));
}
