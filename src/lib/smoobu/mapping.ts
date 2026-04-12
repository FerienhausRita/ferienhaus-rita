import { createServerClient } from "@/lib/supabase/server";
import type { SmoobuConfig } from "./types";

const DEFAULT_CONFIG: SmoobuConfig = {
  enabled: false,
  apartment_mapping: {
    "grossglockner-suite": 3240557,
    gletscherblick: 3242967,
    almrausch: 3242977,
    edelweiss: 3242982,
  },
  pricing_source: "local",
  last_sync_at: null,
};

let cachedConfig: SmoobuConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60s

export async function getSmoobuConfig(): Promise<SmoobuConfig> {
  if (cachedConfig && Date.now() - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "smoobu_config")
      .single();

    cachedConfig = data?.value as SmoobuConfig ?? DEFAULT_CONFIG;
  } catch {
    cachedConfig = DEFAULT_CONFIG;
  }

  cacheTime = Date.now();
  return cachedConfig;
}

export async function isSmoobuEnabled(): Promise<boolean> {
  const config = await getSmoobuConfig();
  return config.enabled && !!process.env.SMOOBU_API_KEY;
}

export async function getSmoobuApartmentId(
  localSlug: string,
): Promise<number | null> {
  const config = await getSmoobuConfig();
  return config.apartment_mapping[localSlug] ?? null;
}

export async function getLocalApartmentSlug(
  smoobuId: number,
): Promise<string | null> {
  const config = await getSmoobuConfig();
  const entry = Object.entries(config.apartment_mapping).find(
    ([, id]) => id === smoobuId,
  );
  return entry ? entry[0] : null;
}

/** Invalidate the cached config (e.g. after admin updates settings) */
export function invalidateSmoobuConfigCache(): void {
  cachedConfig = null;
  cacheTime = 0;
}
