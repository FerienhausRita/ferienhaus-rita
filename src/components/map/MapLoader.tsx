"use client";

import dynamic from "next/dynamic";
import type { POI } from "./InteractiveMap";

const InteractiveMap = dynamic(() => import("./InteractiveMap"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-center" style={{ height: 500 }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-[#c8a96e] rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-stone-400">Karte wird geladen...</p>
      </div>
    </div>
  ),
});

export default function MapLoader({ pois }: { pois: POI[] }) {
  return <InteractiveMap pois={pois} />;
}
