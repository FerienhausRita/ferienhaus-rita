"use client";

import { useState, ReactNode } from "react";
import {
  updateDisplayName,
  inviteAdmin,
  updateAdminRole,
  removeAdmin,
  triggerIcalSync,
  updateSiteSetting,
} from "@/app/(admin)/admin/actions";

/** Klappbare Sektion */
function Section({
  id,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
      >
        <div>
          <h2 className="font-semibold text-stone-900">{title}</h2>
          {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
        </div>
        <svg
          className={`w-5 h-5 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="p-5 border-t border-stone-100">{children}</div>}
    </div>
  );
}

interface AdminProfile {
  id: string;
  display_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface ICalFeed {
  apartmentId: string;
  apartmentName: string;
  urls: string[];
}

interface SettingsPanelProps {
  currentUserId: string;
  currentName: string;
  currentRole: string;
  admins: AdminProfile[];
  icalFeeds: ICalFeed[];
  exportBaseUrl: string;
  siteSettings: Record<string, any>;
}

export default function SettingsPanel({
  currentUserId,
  currentName,
  currentRole,
  admins,
  icalFeeds,
  exportBaseUrl,
  siteSettings,
}: SettingsPanelProps) {
  // Display name
  const [displayName, setDisplayName] = useState(currentName);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  // Invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "viewer">("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // iCal sync
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<Record<string, { imported: number; deleted: number; error?: string }> | null>(null);

  // Smoobu
  const smoobuConfig = siteSettings?.smoobu_config as { enabled?: boolean; last_sync_at?: string } | undefined;
  const [smoobuEnabled, setSmoobuEnabled] = useState(smoobuConfig?.enabled ?? false);
  const [smoobuSyncing, setSmoobuSyncing] = useState(false);
  const [smoobuResult, setSmoobuResult] = useState<{ success: boolean; stats?: Record<string, number>; error?: string } | null>(null);
  const [smoobuTesting, setSmoobuTesting] = useState(false);
  const [smoobuTestResult, setSmoobuTestResult] = useState<{ success: boolean; apartments?: { id: number; name: string }[]; error?: string } | null>(null);
  const [smoobuPushingAll, setSmoobuPushingAll] = useState(false);
  const [smoobuPushAllResult, setSmoobuPushAllResult] = useState<{ success: boolean; stats?: Record<string, number>; message?: string; error?: string } | null>(null);

  // Backup
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupResult, setBackupResult] = useState<{ success: boolean; stats?: Record<string, number>; error?: string } | null>(null);

  // Admin list
  const [adminList, setAdminList] = useState(admins);
  const [loading, setLoading] = useState<string | null>(null);

  // Bankdaten
  const bankInit = siteSettings.bank_details ?? {};
  const [bankIban, setBankIban] = useState(bankInit.iban ?? "");
  const [bankBic, setBankBic] = useState(bankInit.bic ?? "");
  const [bankHolder, setBankHolder] = useState(bankInit.holder ?? "");
  const [bankName, setBankName] = useState(bankInit.bank_name ?? "");
  const [bankLoading, setBankLoading] = useState(false);
  const [bankMessage, setBankMessage] = useState<string | null>(null);

  // Check-in Informationen
  const checkinInit = siteSettings.checkin_info ?? {};
  const [checkinKey, setCheckinKey] = useState(checkinInit.key_handover ?? "");
  const [checkinAddress, setCheckinAddress] = useState(checkinInit.address ?? "");
  const [checkinParking, setCheckinParking] = useState(checkinInit.parking ?? "");
  const [checkinRules, setCheckinRules] = useState(checkinInit.house_rules ?? "");
  const [checkinDirections, setCheckinDirections] = useState(checkinInit.directions ?? "");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);

  // E-Mail-Zeitplan
  const timingInit = siteSettings.email_timing ?? {};
  const [paymentDays, setPaymentDays] = useState<number>(timingInit.payment_reminder_days ?? 7);
  const [checkinDays, setCheckinDays] = useState<number>(timingInit.checkin_info_days ?? 3);
  const [thankyouDays, setThankyouDays] = useState<number>(timingInit.thankyou_days ?? 1);
  const [timingLoading, setTimingLoading] = useState(false);
  const [timingMessage, setTimingMessage] = useState<string | null>(null);

  // Bewertungslink
  const reviewInit = siteSettings.review_link ?? {};
  const [reviewUrl, setReviewUrl] = useState(reviewInit.google_url ?? "");
  const [reviewEnabled, setReviewEnabled] = useState(reviewInit.enabled ?? false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // Max Buchungsdatum
  const [maxBookingDate, setMaxBookingDate] = useState(siteSettings.max_booking_date ?? "");
  const [maxDateLoading, setMaxDateLoading] = useState(false);
  const [maxDateMessage, setMaxDateMessage] = useState<string | null>(null);

  // Accordion: welche Sektionen sind offen
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["account"]));
  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNameSave = async () => {
    if (!displayName.trim() || displayName.trim() === currentName) return;
    setNameLoading(true);
    setNameMessage(null);
    const result = await updateDisplayName(displayName.trim());
    setNameLoading(false);
    setNameMessage(result.success ? "Gespeichert" : result.error || "Fehler");
    if (result.success) {
      setTimeout(() => setNameMessage(null), 3000);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setInviteLoading(true);
    setInviteMessage(null);
    const result = await inviteAdmin(inviteEmail.trim(), inviteName.trim(), inviteRole);
    setInviteLoading(false);
    if (result.success) {
      setInviteMessage({ type: "success", text: "Einladung gesendet" });
      setInviteEmail("");
      setInviteName("");
      setShowInvite(false);
    } else {
      setInviteMessage({ type: "error", text: result.error || "Fehler" });
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "viewer") => {
    setLoading(`role-${userId}`);
    const result = await updateAdminRole(userId, newRole);
    if (result.success) {
      setAdminList((prev) =>
        prev.map((a) => (a.id === userId ? { ...a, role: newRole } : a))
      );
    }
    setLoading(null);
  };

  const handleRemove = async (admin: AdminProfile) => {
    if (!confirm(`${admin.display_name} wirklich entfernen?`)) return;
    setLoading(`remove-${admin.id}`);
    const result = await removeAdmin(admin.id);
    if (result.success) {
      setAdminList((prev) => prev.filter((a) => a.id !== admin.id));
    }
    setLoading(null);
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    const result = await triggerIcalSync();
    setSyncLoading(false);
    if (result.success && result.results) {
      setSyncResult(result.results);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleSmoobuToggle = async () => {
    const newValue = !smoobuEnabled;
    setSmoobuEnabled(newValue);
    await updateSiteSetting("smoobu_config", {
      ...(smoobuConfig || {}),
      enabled: newValue,
    });
  };

  const handleSmoobuTest = async () => {
    setSmoobuTesting(true);
    setSmoobuTestResult(null);
    try {
      const res = await fetch("/api/admin/smoobu/test");
      const data = await res.json();
      setSmoobuTestResult(data);
    } catch {
      setSmoobuTestResult({ success: false, error: "Verbindungsfehler" });
    }
    setSmoobuTesting(false);
  };

  const handleSmoobuSync = async () => {
    setSmoobuSyncing(true);
    setSmoobuResult(null);
    try {
      const res = await fetch("/api/cron/smoobu-sync");
      const data = await res.json();
      setSmoobuResult(data);
    } catch {
      setSmoobuResult({ success: false, error: "Sync fehlgeschlagen" });
    }
    setSmoobuSyncing(false);
  };

  const handleSmoobuPushAll = async () => {
    if (!confirm("Alle bestehenden Buchungen an Smoobu übertragen? Bestehende Datumsblockierungen werden durch vollständige Buchungen mit Gästedaten ersetzt.")) return;
    setSmoobuPushingAll(true);
    setSmoobuPushAllResult(null);
    try {
      const res = await fetch("/api/admin/smoobu/push-all", { method: "POST" });
      const data = await res.json();
      setSmoobuPushAllResult(data);
    } catch {
      setSmoobuPushAllResult({ success: false, error: "Übertragung fehlgeschlagen" });
    }
    setSmoobuPushingAll(false);
  };

  const handleBackupNow = async () => {
    setBackupRunning(true);
    setBackupResult(null);
    try {
      const res = await fetch("/api/cron/backup");
      const data = await res.json();
      setBackupResult(data);
    } catch {
      setBackupResult({ success: false, error: "Backup fehlgeschlagen" });
    }
    setBackupRunning(false);
  };

  const handleBankSave = async () => {
    setBankLoading(true);
    setBankMessage(null);
    const result = await updateSiteSetting("bank_details", {
      iban: bankIban.trim(),
      bic: bankBic.trim(),
      holder: bankHolder.trim(),
      bank_name: bankName.trim(),
    });
    setBankLoading(false);
    setBankMessage(result.success ? "Gespeichert" : result.error || "Fehler");
    if (result.success) setTimeout(() => setBankMessage(null), 3000);
  };

  const handleCheckinSave = async () => {
    setCheckinLoading(true);
    setCheckinMessage(null);
    const result = await updateSiteSetting("checkin_info", {
      key_handover: checkinKey.trim(),
      address: checkinAddress.trim(),
      parking: checkinParking.trim(),
      house_rules: checkinRules.trim(),
      directions: checkinDirections.trim(),
    });
    setCheckinLoading(false);
    setCheckinMessage(result.success ? "Gespeichert" : result.error || "Fehler");
    if (result.success) setTimeout(() => setCheckinMessage(null), 3000);
  };

  const handleTimingSave = async () => {
    setTimingLoading(true);
    setTimingMessage(null);
    const result = await updateSiteSetting("email_timing", {
      payment_reminder_days: paymentDays,
      checkin_info_days: checkinDays,
      thankyou_days: thankyouDays,
    });
    setTimingLoading(false);
    setTimingMessage(result.success ? "Gespeichert" : result.error || "Fehler");
    if (result.success) setTimeout(() => setTimingMessage(null), 3000);
  };

  const handleReviewSave = async () => {
    setReviewLoading(true);
    setReviewMessage(null);
    const result = await updateSiteSetting("review_link", {
      google_url: reviewUrl.trim(),
      enabled: reviewEnabled,
    });
    setReviewLoading(false);
    setReviewMessage(result.success ? "Gespeichert" : result.error || "Fehler");
    if (result.success) setTimeout(() => setReviewMessage(null), 3000);
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50";
  const textareaClass =
    "w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50 min-h-[80px] resize-y";
  const btnClass =
    "px-4 py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50";
  const successClass = "text-xs text-emerald-600 mt-1";

  return (
    <div className="space-y-6">
      {/* Account */}
      <Section id="account" title="Mein Konto" open={openSections.has("account")} onToggle={toggleSection}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Anzeigename
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              />
              <button
                onClick={handleNameSave}
                disabled={nameLoading || !displayName.trim() || displayName.trim() === currentName}
                className={btnClass}
              >
                {nameLoading ? "..." : "Speichern"}
              </button>
            </div>
            {nameMessage && (
              <p className={successClass}>{nameMessage}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Rolle
            </label>
            <p className="text-sm text-stone-700 capitalize">
              {currentRole === "admin" ? "Administrator" : "Betrachter"}
            </p>
          </div>
        </div>
      </Section>

      {/* User Management */}
      <Section id="users" title="Benutzer" open={openSections.has("users")} onToggle={toggleSection}>
        {currentRole === "admin" && (
          <div className="mb-4">
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="px-3 py-1.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Einladen
            </button>
          </div>
        )}

        {/* Invite form */}
        {showInvite && (
          <form onSubmit={handleInvite} className="p-5 border-b border-stone-100 bg-stone-50 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="max@beispiel.at"
                  className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Rolle
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "viewer")}
                className="w-full sm:w-auto px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
              >
                <option value="viewer">Betrachter (nur lesen)</option>
                <option value="admin">Administrator (alles)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-5 py-2.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {inviteLoading ? "Wird eingeladen..." : "Einladung senden"}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="px-4 py-2.5 text-sm font-medium text-stone-600"
              >
                Abbrechen
              </button>
            </div>
            {inviteMessage && (
              <p
                className={`text-xs ${
                  inviteMessage.type === "success"
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {inviteMessage.text}
              </p>
            )}
          </form>
        )}

        {/* Admin list */}
        <div className="divide-y divide-stone-100">
          {adminList.map((admin) => (
            <div
              key={admin.id}
              className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-900">
                    {admin.display_name}
                  </span>
                  {admin.id === currentUserId && (
                    <span className="text-xs text-stone-400">(du)</span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      admin.role === "admin"
                        ? "bg-[#c8a96e]/10 text-[#c8a96e]"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {admin.role === "admin" ? "Admin" : "Betrachter"}
                  </span>
                </div>
                <p className="text-xs text-stone-500">{admin.email}</p>
              </div>
              {currentRole === "admin" && admin.id !== currentUserId && (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={admin.role}
                    onChange={(e) =>
                      handleRoleChange(admin.id, e.target.value as "admin" | "viewer")
                    }
                    disabled={loading !== null}
                    className="px-2 py-1.5 text-xs border border-stone-200 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="viewer">Betrachter</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => handleRemove(admin)}
                    disabled={loading !== null}
                    className="p-1.5 text-stone-300 hover:text-red-500 transition-colors"
                    title="Entfernen"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Maximales Buchungsdatum */}
      <Section id="max-date" title="Buchungszeitraum begrenzen" subtitle="Buchungen nur bis zu einem bestimmten Datum zulassen" open={openSections.has("max-date")} onToggle={toggleSection}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={maxBookingDate}
              onChange={(e) => setMaxBookingDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c8a96e]/30 focus:border-[#c8a96e] outline-none"
            />
            <button
              onClick={async () => {
                setMaxDateLoading(true);
                setMaxDateMessage(null);
                const result = await updateSiteSetting("max_booking_date", maxBookingDate || null);
                setMaxDateLoading(false);
                setMaxDateMessage(result.success ? (maxBookingDate ? `Buchungen bis ${new Date(maxBookingDate + "T00:00:00").toLocaleDateString("de-AT")} m\u00f6glich` : "Begrenzung entfernt") : result.error || "Fehler");
              }}
              disabled={maxDateLoading}
              className="px-4 py-2 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {maxDateLoading ? "..." : "Speichern"}
            </button>
            {maxBookingDate && (
              <button
                onClick={async () => {
                  setMaxDateLoading(true);
                  setMaxBookingDate("");
                  const result = await updateSiteSetting("max_booking_date", null);
                  setMaxDateLoading(false);
                  setMaxDateMessage(result.success ? "Begrenzung entfernt" : result.error || "Fehler");
                }}
                disabled={maxDateLoading}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Entfernen
              </button>
            )}
          </div>
          {maxBookingDate && (
            <p className="text-xs text-amber-600">
              Buchungen sind nur bis {new Date(maxBookingDate + "T00:00:00").toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric" })} m&ouml;glich. Alle sp&auml;teren Daten sind gesperrt.
            </p>
          )}
          {!maxBookingDate && (
            <p className="text-xs text-stone-400">
              Kein Limit gesetzt &ndash; Buchungen sind unbegrenzt m&ouml;glich.
            </p>
          )}
          {maxDateMessage && (
            <p className="text-xs text-emerald-600">{maxDateMessage}</p>
          )}
        </div>
      </Section>

      {/* Bankdaten */}
      <Section id="bank" title="Bankdaten" subtitle="Werden in Buchungsbestätigungen und Zahlungserinnerungen angezeigt" open={openSections.has("bank")} onToggle={toggleSection}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">IBAN</label>
              <input type="text" value={bankIban} onChange={(e) => setBankIban(e.target.value)} className={inputClass} placeholder="AT00 0000 0000 0000 0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">BIC</label>
              <input type="text" value={bankBic} onChange={(e) => setBankBic(e.target.value)} className={inputClass} placeholder="ABCDEFGH" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Kontoinhaber</label>
              <input type="text" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} className={inputClass} placeholder="Max Mustermann" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Bankname</label>
              <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} placeholder="Raiffeisenbank" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleBankSave} disabled={bankLoading} className={btnClass}>
              {bankLoading ? "..." : "Speichern"}
            </button>
            {bankMessage && <p className={successClass}>{bankMessage}</p>}
          </div>
        </div>
      </Section>

      {/* Check-in Informationen */}
      <Section id="checkin" title="Check-in Informationen" subtitle="Werden automatisch vor dem Check-in an Gäste gesendet" open={openSections.has("checkin")} onToggle={toggleSection}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Schlüsselübergabe</label>
            <textarea value={checkinKey} onChange={(e) => setCheckinKey(e.target.value)} className={textareaClass} placeholder="z.B. Schlüsselbox am Eingang, Code: 1234" rows={2} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Adresse</label>
            <input type="text" value={checkinAddress} onChange={(e) => setCheckinAddress(e.target.value)} className={inputClass} placeholder="Musterstraße 1, 9981 Kals am Großglockner" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Parkplatz</label>
            <textarea value={checkinParking} onChange={(e) => setCheckinParking(e.target.value)} className={textareaClass} placeholder="Hinweise zum Parkplatz" rows={2} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Hausregeln</label>
            <textarea value={checkinRules} onChange={(e) => setCheckinRules(e.target.value)} className={textareaClass} placeholder="Wichtige Hausregeln für Gäste" rows={3} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Anfahrt</label>
            <textarea value={checkinDirections} onChange={(e) => setCheckinDirections(e.target.value)} className={textareaClass} placeholder="Anfahrtsbeschreibung" rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCheckinSave} disabled={checkinLoading} className={btnClass}>
              {checkinLoading ? "..." : "Speichern"}
            </button>
            {checkinMessage && <p className={successClass}>{checkinMessage}</p>}
          </div>
        </div>
      </Section>

      {/* E-Mail-Zeitplan */}
      <Section id="email-timing" title="E-Mail-Zeitplan" subtitle="Automatischer Versand von E-Mails an Gäste" open={openSections.has("email-timing")} onToggle={toggleSection}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Zahlungserinnerung nach
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={paymentDays}
                  onChange={(e) => setPaymentDays(Number(e.target.value))}
                  className={inputClass}
                />
                <span className="text-sm text-stone-500 whitespace-nowrap">Tagen</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Check-in-Info
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={checkinDays}
                  onChange={(e) => setCheckinDays(Number(e.target.value))}
                  className={inputClass}
                />
                <span className="text-sm text-stone-500 whitespace-nowrap">Tage vorher</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Danke-Mail
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={14}
                  value={thankyouDays}
                  onChange={(e) => setThankyouDays(Number(e.target.value))}
                  className={inputClass}
                />
                <span className="text-sm text-stone-500 whitespace-nowrap">Tage nach Abreise</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleTimingSave} disabled={timingLoading} className={btnClass}>
              {timingLoading ? "..." : "Speichern"}
            </button>
            {timingMessage && <p className={successClass}>{timingMessage}</p>}
          </div>
        </div>
      </Section>

      {/* Bewertungslink */}
      <Section id="review" title="Bewertungslink" subtitle="Google-Bewertungslink in Danke-Mails einbinden" open={openSections.has("review")} onToggle={toggleSection}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Google Bewertungs-URL</label>
            <input type="url" value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} className={inputClass} placeholder="https://g.page/r/..." />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reviewEnabled}
                onChange={(e) => setReviewEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-[#c8a96e] focus:ring-[#c8a96e]/50"
              />
              <span className="text-sm text-stone-700">In Danke-Mails anzeigen</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleReviewSave} disabled={reviewLoading} className={btnClass}>
              {reviewLoading ? "..." : "Speichern"}
            </button>
            {reviewMessage && <p className={successClass}>{reviewMessage}</p>}
          </div>
        </div>
      </Section>

      {/* Smoobu API */}
      <Section id="smoobu" title="Smoobu API" subtitle="Bidirektionale Synchronisation mit Smoobu Channel Manager" open={openSections.has("smoobu")} onToggle={toggleSection}>
        <div className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">Integration aktiv</p>
              <p className="text-xs text-stone-400">Aktiviert Webhook-Empfang und täglichen Sync um 7 Uhr</p>
            </div>
            <button
              onClick={handleSmoobuToggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${smoobuEnabled ? "bg-emerald-500" : "bg-stone-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${smoobuEnabled ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {/* Test connection */}
          <div className="flex gap-2">
            <button onClick={handleSmoobuTest} disabled={smoobuTesting} className={btnClass}>
              {smoobuTesting ? "Teste..." : "Verbindung testen"}
            </button>
            <button onClick={handleSmoobuSync} disabled={smoobuSyncing} className={btnClass}>
              {smoobuSyncing ? "Sync läuft..." : "Jetzt synchronisieren"}
            </button>
          </div>

          {/* Test result */}
          {smoobuTestResult && (
            <div className={`rounded-xl p-4 ${smoobuTestResult.success ? "bg-emerald-50" : "bg-red-50"}`}>
              {smoobuTestResult.success ? (
                <div>
                  <p className="text-sm font-medium text-emerald-700 mb-1">Verbindung erfolgreich</p>
                  {smoobuTestResult.apartments?.map((apt) => (
                    <p key={apt.id} className="text-xs text-emerald-600">
                      {apt.name} (ID: {apt.id})
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-red-600">{smoobuTestResult.error}</p>
              )}
            </div>
          )}

          {/* Sync result */}
          {smoobuResult && (
            <div className={`rounded-xl p-4 ${smoobuResult.success ? "bg-emerald-50" : "bg-red-50"}`}>
              {smoobuResult.success && smoobuResult.stats ? (
                <div>
                  <p className="text-sm font-medium text-emerald-700 mb-1">Sync abgeschlossen</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-emerald-600">
                    <span>Neue Buchungen: {smoobuResult.stats.pulled}</span>
                    <span>Aktualisiert: {smoobuResult.stats.updated}</span>
                    <span>Retried: {smoobuResult.stats.retried}</span>
                    <span>Fehler: {smoobuResult.stats.errors}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600">{smoobuResult.error || "Sync fehlgeschlagen"}</p>
              )}
            </div>
          )}

          {/* Push all existing bookings */}
          <div className="border-t border-stone-100 pt-4">
            <p className="text-sm font-medium text-stone-700 mb-1">Bestehende Buchungen übertragen</p>
            <p className="text-xs text-stone-400 mb-2">
              Überträgt alle lokalen Buchungen mit vollständigen Gästedaten (Name, E-Mail, Preis) an Smoobu. Ersetzt leere Datumsblockierungen durch echte Reservierungen.
            </p>
            <button onClick={handleSmoobuPushAll} disabled={smoobuPushingAll} className={btnClass}>
              {smoobuPushingAll ? "Übertrage..." : "Alle Buchungen an Smoobu senden"}
            </button>
          </div>

          {smoobuPushAllResult && (
            <div className={`rounded-xl p-4 ${smoobuPushAllResult.success ? "bg-emerald-50" : "bg-red-50"}`}>
              {smoobuPushAllResult.success && smoobuPushAllResult.stats ? (
                <div>
                  <p className="text-sm font-medium text-emerald-700 mb-1">Übertragung abgeschlossen</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-emerald-600">
                    <span>Gesamt: {smoobuPushAllResult.stats.total}</span>
                    <span>Übertragen: {smoobuPushAllResult.stats.pushed}</span>
                    <span>Übersprungen: {smoobuPushAllResult.stats.skipped}</span>
                    <span>Fehler: {smoobuPushAllResult.stats.failed}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600">{smoobuPushAllResult.error || "Übertragung fehlgeschlagen"}</p>
              )}
            </div>
          )}

          {/* Last sync info */}
          {smoobuConfig?.last_sync_at && (
            <p className="text-xs text-stone-400">
              Letzter Sync: {new Date(smoobuConfig.last_sync_at).toLocaleString("de-DE")}
            </p>
          )}

          {/* Webhook URL */}
          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-1">Webhook URL</h3>
            <p className="text-xs text-stone-400 mb-1">
              Diese URL in Smoobu unter Einstellungen → API & Webhooks eintragen:
            </p>
            <div className="flex items-center gap-1">
              <code className="flex-1 bg-stone-50 rounded px-2 py-1 text-xs text-stone-500 truncate">
                {exportBaseUrl}/api/webhooks/smoobu
              </code>
              <button
                onClick={() => handleCopyUrl(`${exportBaseUrl}/api/webhooks/smoobu`)}
                className="shrink-0 px-2 py-1 text-[#c8a96e] hover:text-[#b89555] transition-colors"
                title="Kopieren"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Backup */}
      <Section id="backup" title="Datenbank-Backup" subtitle="T&auml;gliches automatisches Backup um 3 Uhr per E-Mail" open={openSections.has("backup")} onToggle={toggleSection}>
        <div className="space-y-4">
          <p className="text-xs text-stone-400">
            Jeden Tag wird ein vollständiges Backup aller Buchungen, Gästedaten, Einstellungen und Nachrichten als JSON-Datei an {process.env.NEXT_PUBLIC_NOTIFICATION_EMAIL || "deine E-Mail"} gesendet.
          </p>
          <button onClick={handleBackupNow} disabled={backupRunning} className={btnClass}>
            {backupRunning ? "Backup läuft..." : "Jetzt Backup erstellen"}
          </button>
          {backupResult && (
            <div className={`rounded-xl p-4 ${backupResult.success ? "bg-emerald-50" : "bg-red-50"}`}>
              {backupResult.success && backupResult.stats ? (
                <div>
                  <p className="text-sm font-medium text-emerald-700 mb-1">Backup erstellt und versendet</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-emerald-600">
                    <span>Tabellen: {backupResult.stats.tables}</span>
                    <span>Datensätze: {backupResult.stats.rows}</span>
                    <span>Größe: {backupResult.stats.sizeKB} KB</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600">{backupResult.error || "Backup fehlgeschlagen"}</p>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* iCal Sync */}
      <Section id="ical" title="iCal-Synchronisation" subtitle="Kalender-Abgleich mit Airbnb, Booking.com und anderen Plattformen" open={openSections.has("ical")} onToggle={toggleSection}>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={syncLoading}
              className={btnClass}
            >
              {syncLoading ? "Sync l\u00e4uft..." : "Jetzt synchronisieren"}
            </button>
            <p className="text-xs text-stone-400">T\u00e4glich automatisch um 6 Uhr</p>
          </div>

          {/* Sync results */}
          {syncResult && (
            <div className="bg-emerald-50 rounded-xl p-4 space-y-1">
              <p className="text-sm font-medium text-emerald-700 mb-2">
                Sync abgeschlossen
              </p>
              {Object.entries(syncResult).map(([apt, res]) => (
                <div key={apt} className="flex items-center gap-2 text-xs text-emerald-600">
                  <span className="font-medium">{apt}:</span>
                  <span>
                    {res.imported} importiert, {res.deleted} gel\u00f6scht
                    {res.error && (
                      <span className="text-red-500 ml-1">({res.error})</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Import: Externe Plattformen → Rita */}
          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-1">
              Import-Feeds (Plattformen &rarr; Rita)
            </h3>
            <p className="text-xs text-stone-400 mb-3">
              Buchungen von externen Plattformen werden automatisch importiert und blockieren den Kalender.
            </p>
            <div className="space-y-3">
              {icalFeeds.map((feed) => (
                <div key={feed.apartmentId} className="bg-stone-50 rounded-xl p-3">
                  <p className="text-sm font-medium text-stone-800 mb-2">
                    {feed.apartmentName}
                  </p>
                  <div className="space-y-1.5">
                    {feed.urls.map((url, i) => {
                      const source = url.includes("airbnb") ? "Airbnb" : url.includes("smoobu") ? "Smoobu" : url.includes("booking") ? "Booking.com" : "Extern";
                      const badgeColor = source === "Airbnb" ? "bg-rose-100 text-rose-700" : source === "Smoobu" ? "bg-blue-100 text-blue-700" : source === "Booking.com" ? "bg-indigo-100 text-indigo-700" : "bg-stone-100 text-stone-600";
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeColor}`}>
                            {source}
                          </span>
                          <code className="flex-1 text-[11px] text-stone-400 truncate">
                            {url}
                          </code>
                        </div>
                      );
                    })}
                    {feed.urls.length === 0 && (
                      <p className="text-xs text-stone-400 italic">Keine Import-Feeds konfiguriert</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export: Rita → Externe Plattformen */}
          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-1">
              Export-Feeds (Rita &rarr; Plattformen)
            </h3>
            <p className="text-xs text-stone-400 mb-3">
              Diese URLs bei Airbnb, Booking.com oder anderen Plattformen als iCal-Import eintragen, damit dort Website-Buchungen als blockiert erscheinen.
            </p>
            <div className="space-y-2">
              {icalFeeds.map((feed) => {
                const exportUrl = `${exportBaseUrl}/api/ical/${feed.apartmentId}`;
                return (
                  <div key={feed.apartmentId} className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-stone-700 w-36 shrink-0 truncate">
                      {feed.apartmentName}:
                    </span>
                    <code className="flex-1 bg-stone-50 rounded px-2 py-1.5 text-stone-500 truncate">
                      {exportUrl}
                    </code>
                    <button
                      onClick={() => handleCopyUrl(exportUrl)}
                      className="shrink-0 px-2 py-1 text-[#c8a96e] hover:text-[#b89555] transition-colors"
                      title="Kopieren"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
