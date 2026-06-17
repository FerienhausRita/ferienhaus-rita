import { createServerClient } from "@/lib/supabase/server";

/**
 * Plattform-Auszahlungs-Konfiguration: wann wird je Kanal die Auszahlung
 * erwartet. `ref` = Bezugsdatum (Anreise/Abreise), `days` = Versatz in Tagen.
 */
export interface PayoutRule {
  ref: "checkin" | "checkout";
  days: number;
}
export type PlatformPayoutConfig = Record<string, PayoutRule>;

export const DEFAULT_PAYOUT_CONFIG: PlatformPayoutConfig = {
  Airbnb: { ref: "checkin", days: 1 },
  "Booking.com": { ref: "checkout", days: 3 },
  Holidu: { ref: "checkout", days: 7 },
  Andere: { ref: "checkout", days: 5 },
};

export async function getPlatformPayoutConfig(): Promise<PlatformPayoutConfig> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "platform_payout_config")
      .maybeSingle();
    const cfg = (data?.value as PlatformPayoutConfig | null) ?? null;
    if (!cfg || typeof cfg !== "object") return DEFAULT_PAYOUT_CONFIG;
    // Mit Defaults mergen, damit fehlende Kanäle abgedeckt sind
    return { ...DEFAULT_PAYOUT_CONFIG, ...cfg };
  } catch {
    return DEFAULT_PAYOUT_CONFIG;
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Berechnet das erwartete Auszahlungsdatum (YYYY-MM-DD) für einen Kanal.
 */
export function computeExpectedPayoutDate(
  channel: string,
  checkIn: string,
  checkOut: string,
  config: PlatformPayoutConfig
): string {
  const rule = config[channel] ?? DEFAULT_PAYOUT_CONFIG.Andere;
  const base = rule.ref === "checkin" ? checkIn : checkOut;
  return addDays(base, rule.days);
}
