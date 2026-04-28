"use client";

import { useState, ReactNode } from "react";
import {
  updateDisplayName,
  inviteAdmin,
  updateAdminRole,
  removeAdmin,
  triggerIcalSync,
  updateSiteSetting,
  updateApartmentName,
  createIcalImportFeed,
  updateIcalImportFeed,
  deleteIcalImportFeed,
  toggleIcalImportFeed,
  sendBookingsExportEmailNow,
  sendTestEmail,
  type TestEmailType,
} from "@/app/(admin)/admin/actions";

/** Test-Mails — sendet jede Mail-Sorte an die Admin-Adresse */
function TestMailsBlock() {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const tests: Array<{ key: TestEmailType; label: string }> = [
    { key: "inquiry_confirmation", label: "Anfrage-Bestätigung" },
    { key: "booking_confirmed", label: "Buchungsbestätigung" },
    { key: "deposit_reminder", label: "Anzahlungs-Reminder" },
    { key: "remainder_reminder", label: "Restbetrag-Reminder" },
    { key: "payment_reminder", label: "Zahlungs-Reminder" },
    { key: "checkin_info", label: "Check-in-Info" },
    { key: "thankyou", label: "Thank-you-Mail" },
    { key: "admin_notes_7d", label: "Admin: Notiz-Reminder" },
    { key: "admin_payment_check_7d", label: "Admin: Anzahlung prüfen" },
  ];

  const send = async (key: TestEmailType, label: string) => {
    setBusy(key);
    setMsg(null);
    const r = await sendTestEmail(key);
    setBusy(null);
    if (r.success) {
      setMsg({
        ok: true,
        text: `„${label}" gesendet an ${r.sentTo ?? "Admin"}.`,
      });
    } else {
      setMsg({ ok: false, text: `Fehler: ${r.error}` });
    }
    setTimeout(() => setMsg(null), 5000);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Jeder Klick sendet einen Beispiel der jeweiligen Mail an die hinterlegte
        Admin-Adresse (NOTIFICATION_EMAIL). Vorlagedaten werden aus der jüngsten
        Buchung übernommen.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {tests.map((t) => (
          <button
            key={t.key}
            onClick={() => send(t.key, t.label)}
            disabled={busy !== null}
            className="px-3 py-2 text-left text-sm bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {busy === t.key ? "Sende…" : t.label}
          </button>
        ))}
      </div>
      {msg && (
        <p
          className={`text-xs ${
            msg.ok ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

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

export interface ICalImportFeed {
  id: string;
  apartment_id: string;
  apartment_name: string;
  url: string;
  label: string | null;
  active: boolean;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  last_sync_event_count: number | null;
}

interface ApartmentNameEntry {
  id: string;
  defaultName: string;   // from src/data/apartments.ts
  currentName: string;   // from DB override, falls back to default
}

interface SettingsPanelProps {
  currentUserId: string;
  currentName: string;
  currentRole: string;
  admins: AdminProfile[];
  icalFeeds: ICalFeed[];
  icalImportFeeds: ICalImportFeed[];
  exportBaseUrl: string;
  siteSettings: Record<string, any>;
  apartmentNames: ApartmentNameEntry[];
}

export default function SettingsPanel({
  currentUserId,
  currentName,
  currentRole,
  admins,
  icalFeeds,
  icalImportFeeds,
  exportBaseUrl,
  siteSettings,
  apartmentNames,
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
  // Rückwärts-kompatibel: alte Datensätze nutzten "holder", neue "account_holder"
  const [bankHolder, setBankHolder] = useState(
    bankInit.account_holder ?? bankInit.holder ?? ""
  );
  const [bankName, setBankName] = useState(bankInit.bank_name ?? "");
  const [bankLoading, setBankLoading] = useState(false);
  const [bankMessage, setBankMessage] = useState<string | null>(null);

  // Zahlungskonditionen
  const depositInit = siteSettings.deposit_config ?? {};
  const [depositPercent, setDepositPercent] = useState<number>(
    Number(depositInit.deposit_percent ?? 30)
  );
  const [depositDueDays, setDepositDueDays] = useState<number>(
    Number(depositInit.deposit_due_days ?? 7)
  );
  const [remainderDaysBefore, setRemainderDaysBefore] = useState<number>(
    Number(depositInit.remainder_days_before_checkin ?? 30)
  );
  const [depositCfgLoading, setDepositCfgLoading] = useState(false);
  const [depositCfgMessage, setDepositCfgMessage] = useState<string | null>(null);

  // Check-in Informationen
  const checkinInit = siteSettings.checkin_info ?? {};
  const [checkinKey, setCheckinKey] = useState(checkinInit.key_handover ?? "");
  const [checkinAddress, setCheckinAddress] = useState(checkinInit.address ?? "");
  const [checkinParking, setCheckinParking] = useState(checkinInit.parking ?? "");
  const [checkinRules, setCheckinRules] = useState(checkinInit.house_rules ?? "");
  const [checkinDirections, setCheckinDirections] = useState(checkinInit.directions ?? "");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);

  // Reinigungs-Konfiguration
  const cleaningInit = siteSettings.cleaning_config ?? {};
  const [cleaningBufferDays, setCleaningBufferDays] = useState<number>(
    Number(cleaningInit.buffer_days ?? 1)
  );
  const [cleaningMaxLeadDays, setCleaningMaxLeadDays] = useState<number>(
    Number(cleaningInit.max_lead_days ?? 14)
  );
  const [cleaningCfgLoading, setCleaningCfgLoading] = useState(false);
  const [cleaningCfgMessage, setCleaningCfgMessage] = useState<string | null>(null);

  // E-Mail-Zeitplan
  const timingInit = siteSettings.email_timing ?? {};
  const [paymentDays, setPaymentDays] = useState<number>(timingInit.payment_reminder_days ?? 7);
  const [checkinDays, setCheckinDays] = useState<number>(timingInit.checkin_info_days ?? 3);
  const [thankyouDays, setThankyouDays] = useState<number>(timingInit.thankyou_days ?? 1);
  // Mail-Typ-Toggles: Default = aktiv. enabled[type] !== false → aktiv.
  const enabledInit: Record<string, boolean> = (timingInit.enabled ?? {}) as Record<string, boolean>;
  const isOn = (k: string) => enabledInit[k] !== false;
  const [enabledPaymentReminder, setEnabledPaymentReminder] = useState(isOn("payment_reminder"));
  const [enabledDepositReminder, setEnabledDepositReminder] = useState(isOn("deposit_reminder"));
  const [enabledRemainderReminder, setEnabledRemainderReminder] = useState(isOn("remainder_reminder"));
  const [enabledCheckinInfo, setEnabledCheckinInfo] = useState(isOn("checkin_info"));
  const [enabledThankyou, setEnabledThankyou] = useState(isOn("thankyou"));
  const [enabledLoyalty, setEnabledLoyalty] = useState(isOn("loyalty"));
  const [enabledAdminNotes7d, setEnabledAdminNotes7d] = useState(isOn("admin_notes_7d"));
  const [enabledAdminNotes3d, setEnabledAdminNotes3d] = useState(isOn("admin_notes_3d"));
  const [enabledAdminPaymentCheck7d, setEnabledAdminPaymentCheck7d] = useState(isOn("admin_payment_check_7d"));
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

  // Wohnungsnamen
  const [aptNames, setAptNames] = useState<Record<string, string>>(
    Object.fromEntries(apartmentNames.map((a) => [a.id, a.currentName]))
  );
  const [aptNameLoading, setAptNameLoading] = useState<string | null>(null);
  const [aptNameMessage, setAptNameMessage] = useState<Record<string, string>>({});

  // iCal-Import-Feeds (editierbar)
  const [feeds, setFeeds] = useState<ICalImportFeed[]>(icalImportFeeds);
  const [feedLoading, setFeedLoading] = useState<string | null>(null);
  const [feedMessage, setFeedMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [newFeedAptId, setNewFeedAptId] = useState<string>(
    apartmentNames[0]?.id ?? ""
  );
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedLabel, setNewFeedLabel] = useState("");

  // Täglicher Excel-Export
  const exportInit = siteSettings.export_email_config ?? {};
  const [exportEnabled, setExportEnabled] = useState<boolean>(
    exportInit.enabled ?? false
  );
  const [exportRecipient, setExportRecipient] = useState<string>(
    exportInit.recipient ?? ""
  );
  const [exportCfgLoading, setExportCfgLoading] = useState(false);
  const [exportCfgMessage, setExportCfgMessage] = useState<string | null>(null);
  const [exportSendLoading, setExportSendLoading] = useState(false);
  const [exportSendMessage, setExportSendMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  const handleApartmentNameSave = async (id: string, defaultName: string) => {
    const value = (aptNames[id] ?? "").trim();
    setAptNameLoading(id);
    setAptNameMessage((m) => ({ ...m, [id]: "" }));
    // Empty or matches default → reset override (null)
    const override = value && value !== defaultName ? value : null;
    const result = await updateApartmentName(id, override);
    setAptNameLoading(null);
    setAptNameMessage((m) => ({
      ...m,
      [id]: result.success ? "Gespeichert" : result.error || "Fehler",
    }));
    if (result.success) {
      setTimeout(
        () => setAptNameMessage((m) => ({ ...m, [id]: "" })),
        3000
      );
    }
  };

  // ── iCal feed handlers ──
  const handleToggleFeed = async (id: string, newActive: boolean) => {
    setFeedLoading(`toggle-${id}`);
    setFeedMessage(null);
    const result = await toggleIcalImportFeed(id, newActive);
    setFeedLoading(null);
    if (result.success) {
      setFeeds((prev) =>
        prev.map((f) => (f.id === id ? { ...f, active: newActive } : f))
      );
      setFeedMessage({
        type: "success",
        text: newActive ? "Feed aktiviert" : "Feed deaktiviert",
      });
      setTimeout(() => setFeedMessage(null), 2500);
    } else {
      setFeedMessage({
        type: "error",
        text: result.error || "Fehler beim Aktualisieren",
      });
    }
  };

  const handleDeleteFeed = async (id: string) => {
    if (!confirm("Diesen Feed wirklich entfernen? Die alten Blockierungen werden beim nächsten Sync automatisch bereinigt.")) {
      return;
    }
    setFeedLoading(`delete-${id}`);
    setFeedMessage(null);
    const result = await deleteIcalImportFeed(id);
    setFeedLoading(null);
    if (result.success) {
      setFeeds((prev) => prev.filter((f) => f.id !== id));
      setFeedMessage({ type: "success", text: "Feed entfernt" });
      setTimeout(() => setFeedMessage(null), 2500);
    } else {
      setFeedMessage({
        type: "error",
        text: result.error || "Fehler beim Löschen",
      });
    }
  };

  const handleCreateFeed = async () => {
    if (!newFeedAptId || !newFeedUrl.trim()) {
      setFeedMessage({ type: "error", text: "Wohnung und URL erforderlich" });
      return;
    }
    setFeedLoading("create");
    setFeedMessage(null);
    const result = await createIcalImportFeed({
      apartment_id: newFeedAptId,
      url: newFeedUrl.trim(),
      label: newFeedLabel.trim() || undefined,
    });
    setFeedLoading(null);
    if (result.success) {
      // Optimistic row — gets overwritten by server data on next navigation
      setFeeds((prev) => [
        ...prev,
        {
          id: `optimistic-${Date.now()}`,
          apartment_id: newFeedAptId,
          apartment_name:
            apartmentNames.find((a) => a.id === newFeedAptId)?.currentName ??
            newFeedAptId,
          url: newFeedUrl.trim(),
          label: newFeedLabel.trim() || null,
          active: true,
          last_synced_at: null,
          last_sync_status: null,
          last_sync_error: null,
          last_sync_event_count: null,
        },
      ]);
      setNewFeedUrl("");
      setNewFeedLabel("");
      setFeedMessage({
        type: "success",
        text: "Feed hinzugefügt — beim nächsten Sync wird er verwendet",
      });
      setTimeout(() => setFeedMessage(null), 3500);
    } else {
      setFeedMessage({
        type: "error",
        text: result.error || "Fehler beim Hinzufügen",
      });
    }
  };

  // ── Export e-mail config handlers ──
  const handleSaveExportCfg = async () => {
    setExportCfgLoading(true);
    setExportCfgMessage(null);
    const result = await updateSiteSetting("export_email_config", {
      enabled: exportEnabled,
      recipient: exportRecipient.trim(),
    });
    setExportCfgLoading(false);
    setExportCfgMessage(result.success ? "Gespeichert" : result.error || "Fehler");
    if (result.success) setTimeout(() => setExportCfgMessage(null), 3000);
  };

  const handleSendExportNow = async () => {
    setExportSendLoading(true);
    setExportSendMessage(null);
    const result = await sendBookingsExportEmailNow(
      exportRecipient.trim() || undefined
    );
    setExportSendLoading(false);
    if (result.success) {
      setExportSendMessage({
        type: "success",
        text: `Export an ${result.sentTo} gesendet`,
      });
    } else {
      setExportSendMessage({
        type: "error",
        text: result.error || "Versand fehlgeschlagen",
      });
    }
    setTimeout(() => setExportSendMessage(null), 5000);
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
      account_holder: bankHolder.trim(),
      bank_name: bankName.trim(),
    });
    setBankLoading(false);
    setBankMessage(result.success ? "Gespeichert" : result.error || "Fehler");
    if (result.success) setTimeout(() => setBankMessage(null), 3000);
  };

  const handleDepositCfgSave = async () => {
    const pct = Number(depositPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setDepositCfgMessage("Prozent muss zwischen 0 und 100 liegen");
      return;
    }
    setDepositCfgLoading(true);
    setDepositCfgMessage(null);
    const result = await updateSiteSetting("deposit_config", {
      deposit_percent: Math.round(pct),
      deposit_due_days: Math.max(0, Math.round(Number(depositDueDays))),
      remainder_days_before_checkin: Math.max(0, Math.round(Number(remainderDaysBefore))),
    });
    setDepositCfgLoading(false);
    setDepositCfgMessage(result.success ? "Gespeichert" : result.error || "Fehler");
    if (result.success) setTimeout(() => setDepositCfgMessage(null), 3000);
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

  const handleCleaningCfgSave = async () => {
    if (cleaningBufferDays < 0 || cleaningBufferDays > 7) {
      setCleaningCfgMessage("Puffer muss zwischen 0 und 7 Tagen liegen");
      return;
    }
    if (cleaningMaxLeadDays < 1 || cleaningMaxLeadDays > 60) {
      setCleaningCfgMessage("Max. Vorlauf muss zwischen 1 und 60 Tagen liegen");
      return;
    }
    setCleaningCfgLoading(true);
    setCleaningCfgMessage(null);
    const result = await updateSiteSetting("cleaning_config", {
      buffer_days: Math.round(cleaningBufferDays),
      max_lead_days: Math.round(cleaningMaxLeadDays),
    });
    setCleaningCfgLoading(false);
    setCleaningCfgMessage(result.success ? "Gespeichert" : result.error || "Fehler");
    if (result.success) setTimeout(() => setCleaningCfgMessage(null), 3000);
  };

  const handleTimingSave = async () => {
    setTimingLoading(true);
    setTimingMessage(null);
    const result = await updateSiteSetting("email_timing", {
      payment_reminder_days: paymentDays,
      checkin_info_days: checkinDays,
      thankyou_days: thankyouDays,
      enabled: {
        payment_reminder: enabledPaymentReminder,
        deposit_reminder: enabledDepositReminder,
        remainder_reminder: enabledRemainderReminder,
        checkin_info: enabledCheckinInfo,
        thankyou: enabledThankyou,
        loyalty: enabledLoyalty,
        admin_notes_7d: enabledAdminNotes7d,
        admin_notes_3d: enabledAdminNotes3d,
        admin_payment_check_7d: enabledAdminPaymentCheck7d,
      },
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

      {/* Wohnungsnamen */}
      <Section
        id="apartment-names"
        title="Wohnungsnamen"
        subtitle="Namen der Wohnungen anpassen — greift überall (Buchungen, Rechnungen, E-Mails, Website)"
        open={openSections.has("apartment-names")}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          <p className="text-xs text-stone-500">
            Leer lassen oder den Standard-Namen eingeben, um zur ursprünglichen Bezeichnung zurückzukehren. Der URL-Pfad (<code className="text-[11px] bg-stone-100 px-1.5 py-0.5 rounded">/wohnungen/edelweiss</code>) bleibt in jedem Fall unverändert.
          </p>
          {apartmentNames.map((apt) => {
            const value = aptNames[apt.id] ?? "";
            const isOverridden = value.trim() !== "" && value.trim() !== apt.defaultName;
            const msg = aptNameMessage[apt.id];
            return (
              <div key={apt.id} className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                <div className="w-32 shrink-0 pt-2.5">
                  <p className="text-xs font-medium text-stone-500">
                    Standard
                  </p>
                  <p className="text-sm text-stone-900">{apt.defaultName}</p>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-stone-500 mb-1">
                    Angezeigter Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setAptNames((n) => ({ ...n, [apt.id]: e.target.value }))
                      }
                      placeholder={apt.defaultName}
                      className="flex-1 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/50"
                    />
                    <button
                      type="button"
                      onClick={() => handleApartmentNameSave(apt.id, apt.defaultName)}
                      disabled={aptNameLoading === apt.id}
                      className={btnClass}
                    >
                      {aptNameLoading === apt.id ? "..." : "Speichern"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={
                        msg === "Gespeichert"
                          ? successClass
                          : msg
                          ? "text-xs text-red-600 mt-1"
                          : "text-xs text-stone-400 mt-1"
                      }
                    >
                      {msg
                        ? msg
                        : isOverridden
                        ? "Weicht vom Standard ab"
                        : "Verwendet Standard-Namen"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* Zahlungskonditionen */}
      <Section
        id="deposit-config"
        title="Zahlungskonditionen"
        subtitle="Anzahlungshöhe & Fälligkeiten – greift automatisch für neue Bestätigungen"
        open={openSections.has("deposit-config")}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          <p className="text-xs text-stone-500">
            Die Prozentangaben werden in Bestätigungsmails, Erinnerungen,
            Dashboard und Gästeportal konsistent verwendet. Der Restbetrag
            beträgt automatisch {100 - Number(depositPercent || 0)} %.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Anzahlung (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={depositPercent}
                onChange={(e) => setDepositPercent(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Anzahlung fällig in (Tagen)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={depositDueDays}
                onChange={(e) => setDepositDueDays(Number(e.target.value))}
                className={inputClass}
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Nach Bestätigung der Buchung
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Restbetrag fällig (Tage vor Anreise)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={remainderDaysBefore}
                onChange={(e) => setRemainderDaysBefore(Number(e.target.value))}
                className={inputClass}
              />
              <p className="text-[10px] text-stone-400 mt-1">
                Ist die Anreise früher, wird der Gesamtbetrag sofort fällig
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDepositCfgSave}
              disabled={depositCfgLoading}
              className={btnClass}
            >
              {depositCfgLoading ? "..." : "Speichern"}
            </button>
            {depositCfgMessage && (
              <p
                className={
                  depositCfgMessage === "Gespeichert"
                    ? successClass
                    : "text-xs text-red-600 mt-1"
                }
              >
                {depositCfgMessage}
              </p>
            )}
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
      <Section id="email-timing" title="E-Mail-Zeitplan" subtitle="Automatischer Versand von E-Mails an Gäste & Admin" open={openSections.has("email-timing")} onToggle={toggleSection}>
        <div className="space-y-5">
          {/* Mail-Typ-Toggles */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Aktive automatische Mails
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {/* Gast-Mails */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1">An den Gast</p>
                {[
                  { label: "Zahlungserinnerung", val: enabledPaymentReminder, set: setEnabledPaymentReminder },
                  { label: "Anzahlungs-Reminder", val: enabledDepositReminder, set: setEnabledDepositReminder },
                  { label: "Restbetrag-Reminder", val: enabledRemainderReminder, set: setEnabledRemainderReminder },
                  { label: "Check-in-Info (vor Anreise)", val: enabledCheckinInfo, set: setEnabledCheckinInfo },
                  { label: "Thank-you (nach Abreise)", val: enabledThankyou, set: setEnabledThankyou },
                  { label: "Loyalty-Code (Stammgast-Rabatt)", val: enabledLoyalty, set: setEnabledLoyalty },
                ].map((t) => (
                  <label key={t.label} className="flex items-center gap-2 cursor-pointer text-sm text-stone-700 hover:text-stone-900">
                    <input
                      type="checkbox"
                      checked={t.val}
                      onChange={(e) => t.set(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 text-[#c8a96e] focus:ring-[#c8a96e]/40"
                    />
                    {t.label}
                  </label>
                ))}
              </div>

              {/* Admin-Mails */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-1">Intern (Admin)</p>
                {[
                  { label: "Notiz-Reminder 7 Tage vor Anreise", val: enabledAdminNotes7d, set: setEnabledAdminNotes7d },
                  { label: "Notiz-Reminder 3 Tage vor Anreise", val: enabledAdminNotes3d, set: setEnabledAdminNotes3d },
                  { label: "Anzahlung prüfen (7 Tage nach Bestätigung)", val: enabledAdminPaymentCheck7d, set: setEnabledAdminPaymentCheck7d },
                ].map((t) => (
                  <label key={t.label} className="flex items-center gap-2 cursor-pointer text-sm text-stone-700 hover:text-stone-900">
                    <input
                      type="checkbox"
                      checked={t.val}
                      onChange={(e) => t.set(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 text-[#c8a96e] focus:ring-[#c8a96e]/40"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-stone-400">
              Deaktivierte Mails werden beim Cron-Lauf übersprungen — bestehende geplante Einträge werden auf „skipped" gesetzt, nicht versendet.
            </p>
          </div>

          {/* Versand-Zeitpunkte */}
          <div className="space-y-3 pt-3 border-t border-stone-100">
            <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Versand-Zeitpunkte
            </p>
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
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
            <button onClick={handleTimingSave} disabled={timingLoading} className={btnClass}>
              {timingLoading ? "..." : "Speichern"}
            </button>
            {timingMessage && <p className={successClass}>{timingMessage}</p>}
          </div>
        </div>
      </Section>

      {/* Reinigungs-Konfiguration */}
      <Section
        id="cleaning"
        title="Reinigungsplan"
        subtitle="Bündel-Logik für Reinigungstermine — wie viele Tage vor Anreise muss eine Wohnung spätestens fertig sein"
        open={openSections.has("cleaning")}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Puffer vor Anreise
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={cleaningBufferDays}
                  onChange={(e) => setCleaningBufferDays(Number(e.target.value))}
                  className={inputClass}
                />
                <span className="text-sm text-stone-500 whitespace-nowrap">Tage</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                1 = Reinigung am Tag vor Anreise, 0 = am Anreisetag selbst.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Max. Vorlauf bei freiem Zeitraum
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={cleaningMaxLeadDays}
                  onChange={(e) => setCleaningMaxLeadDays(Number(e.target.value))}
                  className={inputClass}
                />
                <span className="text-sm text-stone-500 whitespace-nowrap">Tage</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Wenn keine Anreise im Plan-Zeitraum ansteht: spätestens nach so vielen Tagen reinigen.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCleaningCfgSave} disabled={cleaningCfgLoading} className={btnClass}>
              {cleaningCfgLoading ? "..." : "Speichern"}
            </button>
            {cleaningCfgMessage && <p className={successClass}>{cleaningCfgMessage}</p>}
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

      {/* Täglicher Excel-Export */}
      <Section
        id="export-email"
        title="Täglicher Excel-Export"
        subtitle="Buchungsübersicht als XLSX täglich per E-Mail zustellen"
        open={openSections.has("export-email")}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          <p className="text-xs text-stone-500">
            Die Datei enthält alle Buchungen mit Formeln, Währungsformatierung
            und einem Gäste-Blatt. Versand erfolgt automatisch jeden Morgen um
            08:00 UTC (~10:00 Ortszeit).
          </p>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={exportEnabled}
              onChange={(e) => setExportEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-[#c8a96e] focus:ring-[#c8a96e]/40"
            />
            <span className="text-sm text-stone-700">
              Täglichen Versand aktivieren
            </span>
          </label>

          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">
              Empfänger-E-Mail
            </label>
            <input
              type="email"
              value={exportRecipient}
              onChange={(e) => setExportRecipient(e.target.value)}
              placeholder="manuel@example.com"
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSaveExportCfg}
              disabled={exportCfgLoading}
              className={btnClass}
            >
              {exportCfgLoading ? "..." : "Speichern"}
            </button>
            <button
              onClick={handleSendExportNow}
              disabled={exportSendLoading || !exportRecipient.trim()}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {exportSendLoading ? "Sende..." : "Testversand jetzt"}
            </button>
            {exportCfgMessage && (
              <p
                className={
                  exportCfgMessage === "Gespeichert"
                    ? successClass
                    : "text-xs text-red-600"
                }
              >
                {exportCfgMessage}
              </p>
            )}
          </div>

          {exportSendMessage && (
            <div
              className={`rounded-lg p-3 text-xs font-medium ${
                exportSendMessage.type === "success"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {exportSendMessage.text}
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

          {/* Import: Externe Plattformen → Rita (editierbar) */}
          <div>
            <h3 className="text-sm font-medium text-stone-700 mb-1">
              Import-Feeds (Plattformen &rarr; Rita)
            </h3>
            <p className="text-xs text-stone-400 mb-3">
              Buchungen von externen Plattformen werden automatisch importiert und blockieren den Kalender.
              Du kannst Feeds deaktivieren (Blockierungen verschwinden beim nächsten Sync) oder entfernen.
            </p>

            {feedMessage && (
              <div
                className={`rounded-lg p-2 mb-3 text-xs font-medium ${
                  feedMessage.type === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {feedMessage.text}
              </div>
            )}

            <div className="space-y-3">
              {apartmentNames.map((apt) => {
                const aptFeeds = feeds.filter((f) => f.apartment_id === apt.id);
                return (
                  <div key={apt.id} className="bg-stone-50 rounded-xl p-3">
                    <p className="text-sm font-medium text-stone-800 mb-2">
                      {apt.currentName}
                    </p>
                    {aptFeeds.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">
                        Keine Feeds konfiguriert
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {aptFeeds.map((feed) => {
                          const source =
                            feed.label ||
                            (feed.url.toLowerCase().includes("airbnb")
                              ? "Airbnb"
                              : feed.url.toLowerCase().includes("smoobu")
                              ? "Smoobu"
                              : feed.url.toLowerCase().includes("booking")
                              ? "Booking.com"
                              : "Extern");
                          const badgeColor =
                            source === "Airbnb"
                              ? "bg-rose-100 text-rose-700"
                              : source === "Smoobu"
                              ? "bg-blue-100 text-blue-700"
                              : source === "Booking.com"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-stone-100 text-stone-600";
                          const syncOk = feed.last_sync_status === "ok";
                          const syncErr = feed.last_sync_status === "error";
                          return (
                            <div
                              key={feed.id}
                              className={`bg-white rounded-lg border p-2 ${
                                feed.active
                                  ? "border-stone-200"
                                  : "border-stone-100 opacity-50"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeColor}`}
                                >
                                  {source}
                                </span>
                                <code className="flex-1 text-[11px] text-stone-500 truncate">
                                  {feed.url}
                                </code>
                                <button
                                  onClick={() =>
                                    handleToggleFeed(feed.id, !feed.active)
                                  }
                                  disabled={feedLoading !== null}
                                  className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                                    feed.active
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                      : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                                  }`}
                                >
                                  {feed.active ? "Aktiv" : "Inaktiv"}
                                </button>
                                <button
                                  onClick={() => handleDeleteFeed(feed.id)}
                                  disabled={feedLoading !== null}
                                  className="text-stone-300 hover:text-red-500 transition-colors"
                                  title="Feed entfernen"
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-stone-400">
                                {feed.last_synced_at ? (
                                  <>
                                    <span>
                                      Zuletzt:{" "}
                                      {new Date(
                                        feed.last_synced_at
                                      ).toLocaleString("de-AT")}
                                    </span>
                                    {syncOk && (
                                      <span className="text-emerald-600">
                                        ✓ {feed.last_sync_event_count ?? 0} Events
                                      </span>
                                    )}
                                    {syncErr && (
                                      <span
                                        className="text-red-600 truncate"
                                        title={feed.last_sync_error ?? ""}
                                      >
                                        ⚠ Fehler
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="italic">Noch nicht synchronisiert</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Neuer Feed */}
            <div className="mt-4 bg-stone-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Neuer Feed
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select
                  value={newFeedAptId}
                  onChange={(e) => setNewFeedAptId(e.target.value)}
                  className="px-2 py-1.5 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
                >
                  {apartmentNames.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.currentName}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  placeholder="https://..."
                  className="sm:col-span-2 px-2 py-1.5 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
                />
                <input
                  type="text"
                  value={newFeedLabel}
                  onChange={(e) => setNewFeedLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="px-2 py-1.5 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40"
                />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleCreateFeed}
                  disabled={
                    feedLoading === "create" ||
                    !newFeedUrl.trim() ||
                    !newFeedAptId
                  }
                  className="px-3 py-1.5 bg-[#c8a96e] hover:bg-[#b89555] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {feedLoading === "create" ? "Speichern..." : "+ Feed hinzufügen"}
                </button>
                <p className="text-[11px] text-stone-400">
                  Label wird aus der URL abgeleitet, wenn leer gelassen.
                </p>
              </div>
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

      {/* Test-Mails */}
      <Section
        id="test-mails"
        title="Test-Mails"
        subtitle="Eine Mail jeder Sorte an die Admin-Adresse senden — zum Layout-Check"
        open={openSections.has("test-mails")}
        onToggle={toggleSection}
      >
        <TestMailsBlock />
      </Section>
    </div>
  );
}
