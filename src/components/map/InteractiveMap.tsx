"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface POI {
  id: string;
  name: string;
  description: string | null;
  category: string;
  lat: number;
  lng: number;
  address: string | null;
  website: string | null;
  is_featured: boolean;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  restaurant: { label: "Restaurants", color: "#c8a96e", emoji: "🍽️" },
  hiking: { label: "Wandern", color: "#16a34a", emoji: "🥾" },
  activity: { label: "Aktivitäten", color: "#2563eb", emoji: "⭐" },
  viewpoint: { label: "Aussichtspunkte", color: "#9333ea", emoji: "👁️" },
  shopping: { label: "Einkaufen", color: "#ea580c", emoji: "🛒" },
  emergency: { label: "Notfall", color: "#dc2626", emoji: "🚨" },
  ski: { label: "Skigebiet", color: "#0891b2", emoji: "⛷️" },
  accommodation: { label: "Unterkunft", color: "#c8a96e", emoji: "🏠" },
};

function createIcon(category: string) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.activity;
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${config.color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">${config.emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

interface InteractiveMapProps {
  pois: POI[];
}

export default function InteractiveMap({ pois }: InteractiveMapProps) {
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(Object.keys(CATEGORY_CONFIG))
  );

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const filteredPois = pois.filter((p) => activeCategories.has(p.category));

  // Get unique categories from actual POIs
  const availableCategories = [...new Set(pois.map((p) => p.category))];

  return (
    <div>
      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {availableCategories.map((cat) => {
          const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.activity;
          const isActive = activeCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                isActive
                  ? "text-white border-transparent"
                  : "bg-white text-stone-400 border-stone-200"
              }`}
              style={isActive ? { backgroundColor: config.color } : undefined}
            >
              <span>{config.emoji}</span>
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
        <MapContainer
          center={[47.0045, 12.6432]}
          zoom={13}
          style={{ height: "500px", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredPois.map((poi) => (
            <Marker
              key={poi.id}
              position={[poi.lat, poi.lng]}
              icon={createIcon(poi.category)}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-bold text-stone-900 text-sm">{poi.name}</h3>
                  {poi.description && (
                    <p className="text-xs text-stone-600 mt-1">{poi.description}</p>
                  )}
                  {poi.address && (
                    <p className="text-xs text-stone-400 mt-1">{poi.address}</p>
                  )}
                  {poi.website && (
                    <a
                      href={poi.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#c8a96e] hover:underline mt-2 inline-block"
                    >
                      Website besuchen
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
