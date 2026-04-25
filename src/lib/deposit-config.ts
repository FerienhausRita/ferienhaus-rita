/**
 * Server-only helper: Load deposit configuration from site_settings.
 * Provides defaults so callers always get valid numbers.
 */

import { createServerClient } from "@/lib/supabase/server";

export interface DepositConfig {
  /** Percentage 0-100 (default 30) */
  deposit_percent: number;
  /** Days after confirmation when deposit is due (default 14) */
  deposit_due_days: number;
  /** Days before check-in when remainder is due (default 30) */
  remainder_days_before_checkin: number;
}

export const DEPOSIT_DEFAULTS: DepositConfig = {
  deposit_percent: 30,
  deposit_due_days: 14,
  remainder_days_before_checkin: 30,
};

/**
 * Berechne Anzahlung + Restbetrag inkl. Fälligkeitsdaten.
 *
 * - Liegt die Anreise weniger als `remainder_days_before_checkin` Tage in
 *   der Zukunft, wird der gesamte Betrag als „Anzahlung" gefordert
 *   (= Volldepositionierung) und der Restbetrag bleibt bei 0 — sonst splitten
 *   wir nach `deposit_percent`.
 *
 * Wird konsistent von updateBookingStatus, updateBookingDetails und
 * updateBookingPrices genutzt, damit das Verhalten überall gleich ist.
 */
export function computeDepositSplit(opts: {
  totalPrice: number;
  checkIn: string; // YYYY-MM-DD
  config: DepositConfig;
  now?: Date;
}): {
  deposit_amount: number;
  deposit_due_date: string;
  remainder_amount: number;
  remainder_due_date: string | null;
} {
  const { totalPrice, checkIn, config } = opts;
  const now = opts.now ?? new Date();
  const ciDate = new Date(checkIn + "T00:00:00Z");
  const daysUntilCheckin = Math.ceil(
    (ciDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const depositDueDate = new Date(
    now.getTime() + config.deposit_due_days * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];

  if (daysUntilCheckin > config.remainder_days_before_checkin) {
    // Split: Anzahlung jetzt, Restbetrag später
    const deposit =
      Math.round(totalPrice * (config.deposit_percent / 100) * 100) / 100;
    const remainder = Math.round((totalPrice - deposit) * 100) / 100;
    const remainderDueDate = new Date(
      ciDate.getTime() -
        config.remainder_days_before_checkin * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0];
    return {
      deposit_amount: deposit,
      deposit_due_date: depositDueDate,
      remainder_amount: remainder,
      remainder_due_date: remainderDueDate,
    };
  }

  // Volldepositionierung: Anreise zu nah → kein Split
  return {
    deposit_amount: Math.round(totalPrice * 100) / 100,
    deposit_due_date: depositDueDate,
    remainder_amount: 0,
    remainder_due_date: null,
  };
}

export async function getDepositConfig(): Promise<DepositConfig> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "deposit_config")
      .maybeSingle();

    const raw = (data?.value ?? {}) as Partial<DepositConfig>;
    return {
      deposit_percent: Number(raw.deposit_percent ?? DEPOSIT_DEFAULTS.deposit_percent),
      deposit_due_days: Number(raw.deposit_due_days ?? DEPOSIT_DEFAULTS.deposit_due_days),
      remainder_days_before_checkin: Number(
        raw.remainder_days_before_checkin ?? DEPOSIT_DEFAULTS.remainder_days_before_checkin
      ),
    };
  } catch {
    return { ...DEPOSIT_DEFAULTS };
  }
}
