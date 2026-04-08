"use client";

import { useState } from "react";
import {
  updateDisplayName,
  inviteAdmin,
  updateAdminRole,
  removeAdmin,
  triggerIcalSync,
  updateSiteSetting,
} from "@/app/(admin)/admin/actions";

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
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Mein Konto</h2>
        </div>
        <div className="p-5 space-y-3">
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
      </div>

      {/* User Management */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Benutzer</h2>
          {currentRole === "admin" && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="px-3 py-1.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Einladen
            </button>
          )}
        </div>

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
      </div>

      {/* Bankdaten */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Bankdaten</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Werden in Buchungsbestätigungen und Zahlungserinnerungen angezeigt
          </p>
        </div>
        <div className="p-5 space-y-3">
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
      </div>

      {/* Check-in Informationen */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Check-in Informationen</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Werden automatisch vor dem Check-in an Gäste gesendet
          </p>
        </div>
        <div className="p-5 space-y-3">
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
      </div>

      {/* E-Mail-Zeitplan */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">E-Mail-Zeitplan</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Automatischer Versand von E-Mails an Gäste
          </p>
        </div>
        <div className="p-5 space-y-3">
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
      </div>

      {/* Bewertungslink */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Bewertungslink</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Google-Bewertungslink in Danke-Mails einbinden
          </p>
        </div>
        <div className="p-5 space-y-3">
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
      </div>

      {/* iCal Sync */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">iCal-Sync</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Automatischer Import alle 15 Minuten via Vercel Cron
          </p>
        </div>
        <div className="p-5 space-y-4">
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className={btnClass}
          >
            {syncLoading ? "Sync läuft..." : "Jetzt synchronisieren"}
          </button>

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
                    {res.imported} importiert, {res.deleted} gelöscht
                    {res.error && (
                      <span className="text-red-500 ml-1">({res.error})</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Import URLs (from Smoobu) */}
          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-2">
              Import-Feeds (Smoobu → Rita)
            </h3>
            <div className="space-y-2">
              {icalFeeds.map((feed) => (
                <div key={feed.apartmentId} className="text-xs">
                  <span className="font-medium text-stone-700">
                    {feed.apartmentName}:
                  </span>
                  {feed.urls.map((url, i) => (
                    <div key={i} className="flex items-center gap-1 mt-0.5">
                      <code className="flex-1 bg-stone-50 rounded px-2 py-1 text-stone-500 truncate">
                        {url}
                      </code>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Export URLs (Rita → Smoobu) */}
          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-2">
              Export-Feeds (Rita → Smoobu)
            </h3>
            <p className="text-xs text-stone-500 mb-2">
              Diese URLs in Smoobu als iCal-Import eintragen:
            </p>
            <div className="space-y-2">
              {icalFeeds.map((feed) => {
                const exportUrl = `${exportBaseUrl}/api/ical/${feed.apartmentId}`;
                return (
                  <div key={feed.apartmentId} className="text-xs">
                    <span className="font-medium text-stone-700">
                      {feed.apartmentName}:
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <code className="flex-1 bg-stone-50 rounded px-2 py-1 text-stone-500 truncate">
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
