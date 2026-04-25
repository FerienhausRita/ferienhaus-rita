"use server";

import { createServerClient } from "@/lib/supabase/server";
import { sendWaitlistConfirmation, type WaitlistEntry } from "@/lib/email";
import { getApartmentWithPricing } from "@/lib/pricing-data";
import crypto from "crypto";

/**
 * Public action: ein Gast trägt sich auf die Warteliste ein, wenn der gewünschte
 * Zeitraum nicht verfügbar ist. Sammelt nur Name, Telefon, Mail + Zeitraum.
 */
export async function subscribeToWaitlist(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  apartmentId?: string | null; // null/leer = "egal"
}): Promise<{ success: boolean; error?: string }> {
  // Basisvalidierung
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (!firstName || !lastName) return { success: false, error: "Name fehlt" };
  if (!/^\S+@\S+\.\S+$/.test(email))
    return { success: false, error: "Ungültige E-Mail-Adresse" };
  if (!phone) return { success: false, error: "Telefonnummer fehlt" };
  if (input.checkIn >= input.checkOut)
    return { success: false, error: "Zeitraum ungültig" };

  const supabase = createServerClient();

  // Duplikat-Check: gleiche Mail + gleicher Zeitraum + gleiche Wohnung → kein Re-Insert
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id, status")
    .eq("email", email)
    .eq("preferred_check_in", input.checkIn)
    .eq("preferred_check_out", input.checkOut)
    .in("status", ["active", "notified"])
    .maybeSingle();
  if (existing) {
    return {
      success: true, // soft success — User merkt nicht, dass es schon existiert
    };
  }

  const notificationToken = crypto.randomBytes(16).toString("hex");

  const { data: row, error } = await supabase
    .from("waitlist")
    .insert({
      apartment_id: input.apartmentId || null,
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      preferred_check_in: input.checkIn,
      preferred_check_out: input.checkOut,
      notification_token: notificationToken,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { success: false, error: error?.message ?? "Konnte nicht speichern" };
  }

  // Bestätigungsmail an den Gast (best-effort, kein Hard-Fail)
  try {
    let apartmentName: string | undefined;
    if (input.apartmentId) {
      const apt = await getApartmentWithPricing(input.apartmentId);
      apartmentName = apt?.name;
    }
    const entry: WaitlistEntry = {
      id: row.id,
      firstName,
      lastName,
      email,
      phone,
      preferredCheckIn: input.checkIn,
      preferredCheckOut: input.checkOut,
      apartmentId: input.apartmentId ?? null,
      notificationToken,
    };
    await sendWaitlistConfirmation(entry, apartmentName);
  } catch (e) {
    console.error("Waitlist confirmation mail failed:", e);
  }

  return { success: true };
}
