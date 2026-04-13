"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export default function IdleLock() {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [storedPinHash, setStoredPinHash] = useState<string | null | undefined>(undefined);
  const [settingPin, setSettingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load pin hash on mount
  useEffect(() => {
    fetch("/api/admin/pin")
      .then((r) => r.json())
      .then((d) => setStoredPinHash(d.pinHash ?? null))
      .catch(() => setStoredPinHash(null));
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLocked(true);
      setPin("");
      setError(null);
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (locked) return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => resetTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [locked, resetTimer]);

  // Focus input when locked
  useEffect(() => {
    if (locked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [locked, settingPin]);

  const handleUnlock = async () => {
    if (!storedPinHash) {
      // No PIN set → just unlock
      setLocked(false);
      resetTimer();
      return;
    }

    // Verify PIN via API
    try {
      const res = await fetch("/api/admin/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", pin }),
      });
      const data = await res.json();
      if (data.success) {
        setLocked(false);
        setPin("");
        setError(null);
        resetTimer();
      } else {
        setError("Falscher PIN");
        setPin("");
      }
    } catch {
      setError("Fehler bei der Verifizierung");
    }
  };

  const handleSetPin = async () => {
    if (newPin.length < 4 || newPin.length > 6) {
      setError("PIN muss 4-6 Ziffern haben");
      return;
    }
    if (newPin !== confirmPin) {
      setError("PINs stimmen nicht überein");
      return;
    }

    try {
      const res = await fetch("/api/admin/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", pin: newPin }),
      });
      const data = await res.json();
      if (data.success) {
        setStoredPinHash("set");
        setSettingPin(false);
        setLocked(false);
        setNewPin("");
        setConfirmPin("");
        setError(null);
        resetTimer();
      } else {
        setError(data.error || "Fehler beim Setzen des PINs");
      }
    } catch {
      setError("Verbindungsfehler");
    }
  };

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-900/90 backdrop-blur-md flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
        {/* Logo / Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#c8a96e]/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#c8a96e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-stone-900 mb-1">
          Bildschirm gesperrt
        </h2>
        <p className="text-sm text-stone-500 mb-6">
          {!storedPinHash
            ? "Klicken zum Entsperren oder PIN festlegen"
            : "PIN eingeben zum Entsperren"}
        </p>

        {settingPin ? (
          // Set new PIN
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Neuer PIN (4-6 Ziffern)"
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              className="w-full px-4 py-3 text-center text-lg tracking-[0.5em] bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN bestätigen"
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSetPin()}
              className="w-full px-4 py-3 text-center text-lg tracking-[0.5em] bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSettingPin(false);
                  setNewPin("");
                  setConfirmPin("");
                  setError(null);
                }}
                className="flex-1 py-2.5 text-sm text-stone-600 hover:text-stone-800 rounded-xl"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSetPin}
                disabled={newPin.length < 4}
                className="flex-1 py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                PIN setzen
              </button>
            </div>
          </div>
        ) : storedPinHash ? (
          // Enter PIN
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className="w-full px-4 py-3 text-center text-lg tracking-[0.5em] bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              onClick={handleUnlock}
              disabled={pin.length < 4}
              className="w-full py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              Entsperren
            </button>
          </div>
        ) : (
          // No PIN set
          <div className="space-y-3">
            <button
              onClick={handleUnlock}
              className="w-full py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors"
            >
              Entsperren
            </button>
            <button
              onClick={() => setSettingPin(true)}
              className="w-full py-2.5 text-sm text-stone-500 hover:text-stone-700"
            >
              PIN festlegen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
