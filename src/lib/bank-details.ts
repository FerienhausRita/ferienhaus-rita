import { createServerClient } from "@/lib/supabase/server";

export interface BankDetails {
  iban: string;
  bic: string;
  account_holder: string;
  bank_name: string;
}

/**
 * Load bank details from site_settings with backward-compatible key
 * fallback: older records stored the field under `holder`, newer ones
 * under `account_holder` (migration 024). This helper normalizes both.
 */
export async function getBankDetails(): Promise<BankDetails | null> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "bank_details")
      .maybeSingle();
    if (!data?.value) return null;
    return normalizeBankDetails(data.value as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function normalizeBankDetails(
  raw: Record<string, unknown> | null | undefined
): BankDetails | null {
  if (!raw) return null;
  const holder =
    ((raw.account_holder as string | undefined) ?? "").trim() ||
    ((raw.holder as string | undefined) ?? "").trim();
  return {
    iban: ((raw.iban as string) ?? "").trim(),
    bic: ((raw.bic as string) ?? "").trim(),
    bank_name: ((raw.bank_name as string) ?? "").trim(),
    account_holder: holder,
  };
}
