"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Offer {
  apartmentId: string;
  slug: string;
  name: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  image: string | null;
  pricePerNight: number;
  discountedPerNight: number;
}

interface OffersResponse {
  enabled: boolean;
  discountPercent: number;
  daysThreshold: number;
  offers: Offer[];
}

const GOLD = "#b8935a";
const GOLD_2 = "#9c7a45";
const STORAGE_KEY = "lm_popup_seen";

function euro(n: number) {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function fmtRange(checkIn: string, checkOut: string) {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "2-digit", month: "short" };
  const ci = new Date(checkIn + "T00:00:00").toLocaleDateString("de-AT", opts);
  const co = new Date(checkOut + "T00:00:00").toLocaleDateString("de-AT", opts);
  return `${ci} – ${co}`;
}
function dealHref(o: Offer) {
  const p = new URLSearchParams({
    apartment: o.slug,
    checkIn: o.checkIn,
    checkOut: o.checkOut,
    guests: "2",
    lastminute: "1",
  });
  return `/buchen?${p.toString()}`;
}

export default function LastMinutePopup() {
  const [data, setData] = useState<OffersResponse | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Nur 1× pro Tag zeigen.
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(STORAGE_KEY) === today) return;
    } catch {
      /* localStorage evtl. blockiert → einfach fortfahren */
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    fetch("/api/last-minute")
      .then((r) => r.json())
      .then((d: OffersResponse) => {
        if (cancelled) return;
        if (d?.enabled && Array.isArray(d.offers) && d.offers.length > 0) {
          setData(d);
          timer = setTimeout(() => setOpen(true), 4000);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString().slice(0, 10));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open || !data) return null;

  const offers = data.offers.slice(0, 3);
  const hero = offers.find((o) => o.image)?.image ?? null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[#1c1812]/55 backdrop-blur-sm p-0 sm:p-5"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-[410px] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Foto oben */}
        <div
          className="relative h-48 bg-cover bg-center bg-stone-800"
          style={hero ? { backgroundImage: `url("${hero}")` } : { background: "linear-gradient(135deg,#cdbb9c,#8fa2a8)" }}
        >
          <button
            onClick={dismiss}
            aria-label="Schließen"
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm border border-white/35 bg-[#1e1912]/35 backdrop-blur hover:bg-[#1e1912]/55"
          >
            ✕
          </button>
        </div>

        {/* Text darunter */}
        <div className="px-6 pt-5 pb-2">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.2em]" style={{ color: GOLD_2 }}>
            Last Minute · Kals am Großglockner
          </div>
          <h2 className="font-serif text-[26px] leading-tight mt-2 mb-2 text-stone-900">
            Noch diese Woche frei
          </h2>
          <p className="text-sm text-stone-500 leading-relaxed mb-3">
            Kurzentschlossen? Für Anreise in den nächsten {data.daysThreshold} Tagen schenken wir dir{" "}
            <b style={{ color: GOLD_2 }}>{data.discountPercent}% pro Nacht</b>.
          </p>

          <div>
            {offers.map((o, i) => (
              <Link
                key={o.apartmentId}
                href={dealHref(o)}
                onClick={dismiss}
                className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t border-stone-100" : ""} group`}
              >
                <div
                  className="w-[62px] h-[62px] rounded-xl bg-cover bg-center flex-none shadow-sm bg-stone-200"
                  style={o.image ? { backgroundImage: `url("${o.image}")` } : undefined}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[19px] text-stone-900 leading-tight">{o.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {fmtRange(o.checkIn, o.checkOut)} · {o.nights} Nächte
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div>
                    <span className="text-stone-400 line-through text-xs mr-0.5">{euro(o.pricePerNight)}</span>{" "}
                    <span className="font-serif text-[18px] font-bold text-stone-900">{euro(o.discountedPerNight)}</span>
                    <span className="text-[11px] text-stone-400"> / Nacht</span>
                  </div>
                  <span
                    className="inline-block mt-1 text-[10px] font-bold rounded px-1.5 py-0.5"
                    style={{ color: GOLD_2, background: "#f3ead9" }}
                  >
                    −{data.discountPercent}% Last-Minute
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <Link
            href={dealHref(offers[0])}
            onClick={dismiss}
            className="block mt-4 mb-2.5 text-center rounded-2xl bg-stone-900 hover:bg-black text-white text-[15px] font-semibold py-3.5"
          >
            Jetzt buchen &amp; {data.discountPercent}% sparen
          </Link>
          <p className="text-center text-[10.5px] text-stone-400 leading-relaxed px-1.5">
            Rabatt gilt automatisch für Anreise innerhalb von {data.daysThreshold} Tagen, solange verfügbar · direkt gebucht, ohne Plattformgebühr.
          </p>
          <button
            onClick={dismiss}
            className="block w-full text-center text-xs text-stone-400 underline pt-2 pb-5 hover:text-stone-600"
          >
            Jetzt nicht, danke
          </button>
        </div>
      </div>
    </div>
  );
}
