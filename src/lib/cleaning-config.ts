/**
 * Server-only helper: Reinigungs-Konfiguration aus site_settings.
 * Defaults: 1 Tag Puffer vor nächster Anreise, max 14 Tage Lead.
 */

import { createServerClient } from "@/lib/supabase/server";

export interface CleaningConfig {
  /**
   * Tage vor der nächsten Anreise, bis zu denen die Reinigung spätestens
   * fertig sein muss. 1 = Reinigung am Vortag der Anreise.
   * 0 = Reinigung am Anreisetag selbst (nur bei same-day-Wechsel).
   */
  buffer_days: number;
  /**
   * Cap für Wohnungen ohne anstehende Anreise im Zeitraum.
   * Latest fällt dann auf earliest + max_lead_days.
   */
  max_lead_days: number;
}

export const CLEANING_DEFAULTS: CleaningConfig = {
  buffer_days: 1,
  max_lead_days: 14,
};

export async function getCleaningConfig(): Promise<CleaningConfig> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "cleaning_config")
      .maybeSingle();

    const raw = (data?.value ?? {}) as Partial<CleaningConfig>;
    return {
      buffer_days: Number(raw.buffer_days ?? CLEANING_DEFAULTS.buffer_days),
      max_lead_days: Number(
        raw.max_lead_days ?? CLEANING_DEFAULTS.max_lead_days
      ),
    };
  } catch {
    return { ...CLEANING_DEFAULTS };
  }
}
