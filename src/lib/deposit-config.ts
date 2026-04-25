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
