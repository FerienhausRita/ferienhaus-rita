"use client";

import { createAuthBrowserClient } from "@/lib/supabase/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CleaningHeader({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    router.replace("/reinigung/login");
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-[#c8a96e] rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white font-serif text-base font-bold">FR</span>
          </div>
          <div className="min-w-0">
            <p className="font-serif font-bold text-stone-900 leading-tight truncate">
              Ferienhaus Rita
            </p>
            <p className="text-xs text-stone-500 leading-tight">Reinigungs-Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-stone-900 leading-tight truncate max-w-[12rem]">
              {userName}
            </p>
            {userEmail && (
              <p className="text-xs text-stone-500 leading-tight truncate max-w-[12rem]">
                @{userEmail}
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition disabled:opacity-50"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
}
