"use client";

import { useEffect, useState } from "react";
import { createAuthBrowserClient } from "@/lib/supabase/auth-client";
import { useRouter } from "next/navigation";

/**
 * Client-side auth confirmation page.
 * Handles hash-based tokens that the server can't read.
 * Supabase redirects here with #access_token=... or ?code=...
 */
export default function AuthConfirmPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createAuthBrowserClient();

      // Check if there's a session from the URL hash
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth confirm error:", error.message);
        setError(error.message);
        return;
      }

      if (data.session) {
        router.replace("/admin");
        return;
      }

      // If no session yet, wait a moment and try again
      // (sometimes the hash params need a moment to be processed)
      setTimeout(async () => {
        const { data: retryData } = await supabase.auth.getSession();
        if (retryData.session) {
          router.replace("/admin");
        } else {
          setError("Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.");
        }
      }, 1000);
    };

    handleAuth();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 max-w-sm text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a
            href="/auth/login"
            className="text-[#c8a96e] hover:text-[#b89555] font-medium text-sm"
          >
            Zurück zum Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-[#c8a96e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-stone-600 text-sm">Anmeldung wird verarbeitet...</p>
      </div>
    </div>
  );
}
