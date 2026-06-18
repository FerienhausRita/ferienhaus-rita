"use client";

import { useRef, useState } from "react";
import {
  uploadApartmentImage,
  deleteApartmentImage,
  reorderApartmentImages,
  getApartmentImages,
} from "@/app/(admin)/admin/actions";

interface PhotoItem {
  id: string;
  url: string;
}

export interface ApartmentPhotos {
  id: string;
  name: string;
  images: PhotoItem[];
  fallbackImages: string[];
}

export default function PhotoManager({
  apartments,
}: {
  apartments: ApartmentPhotos[];
}) {
  const [state, setState] = useState<Record<string, PhotoItem[]>>(() =>
    Object.fromEntries(apartments.map((a) => [a.id, a.images]))
  );
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string | null>>({});
  const dragItem = useRef<{ apartmentId: string; index: number } | null>(null);

  async function resync(apartmentId: string) {
    const fresh = await getApartmentImages(apartmentId);
    setState((s) => ({ ...s, [apartmentId]: fresh.map((f) => ({ id: f.id, url: f.url })) }));
  }

  async function handleUpload(apartmentId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy((b) => ({ ...b, [apartmentId]: true }));
    setError((e) => ({ ...e, [apartmentId]: null }));
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("apartmentId", apartmentId);
        fd.append("file", file);
        const res = await uploadApartmentImage(fd);
        if (!res.success) {
          setError((e) => ({ ...e, [apartmentId]: res.error ?? "Upload fehlgeschlagen" }));
          break;
        }
      }
      await resync(apartmentId);
    } finally {
      setBusy((b) => ({ ...b, [apartmentId]: false }));
    }
  }

  async function handleDelete(apartmentId: string, imageId: string) {
    if (!confirm("Dieses Foto wirklich löschen?")) return;
    setBusy((b) => ({ ...b, [apartmentId]: true }));
    setError((e) => ({ ...e, [apartmentId]: null }));
    // Optimistisch entfernen
    setState((s) => ({
      ...s,
      [apartmentId]: (s[apartmentId] ?? []).filter((i) => i.id !== imageId),
    }));
    try {
      const res = await deleteApartmentImage(imageId);
      if (!res.success) {
        setError((e) => ({ ...e, [apartmentId]: res.error ?? "Löschen fehlgeschlagen" }));
      }
      await resync(apartmentId);
    } finally {
      setBusy((b) => ({ ...b, [apartmentId]: false }));
    }
  }

  async function persistOrder(apartmentId: string, items: PhotoItem[]) {
    setBusy((b) => ({ ...b, [apartmentId]: true }));
    try {
      const res = await reorderApartmentImages(
        apartmentId,
        items.map((i) => i.id)
      );
      if (!res.success) {
        setError((e) => ({ ...e, [apartmentId]: res.error ?? "Sortieren fehlgeschlagen" }));
        await resync(apartmentId);
      }
    } finally {
      setBusy((b) => ({ ...b, [apartmentId]: false }));
    }
  }

  function handleDrop(apartmentId: string, targetIndex: number) {
    const src = dragItem.current;
    dragItem.current = null;
    if (!src || src.apartmentId !== apartmentId) return;
    if (src.index === targetIndex) return;

    const items = [...(state[apartmentId] ?? [])];
    const [moved] = items.splice(src.index, 1);
    items.splice(targetIndex, 0, moved);
    setState((s) => ({ ...s, [apartmentId]: items }));
    void persistOrder(apartmentId, items);
  }

  return (
    <div className="space-y-6">
      {apartments.map((apt) => {
        const images = state[apt.id] ?? [];
        const isBusy = busy[apt.id];
        const err = error[apt.id];
        return (
          <section
            key={apt.id}
            className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-stone-900">{apt.name}</h2>
              <UploadButton
                apartmentId={apt.id}
                disabled={isBusy}
                onFiles={(files) => handleUpload(apt.id, files)}
              />
            </div>

            {err && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {err}
              </p>
            )}

            {images.length === 0 ? (
              <div>
                <p className="text-sm text-stone-500 mb-3">
                  Noch keine eigenen Fotos – auf der Website werden aktuell die
                  Standard-Fotos angezeigt:
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 opacity-60">
                  {apt.fallbackImages.slice(0, 5).map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="w-full aspect-[4/3] object-cover rounded-lg border border-stone-200"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-stone-400 mb-3">
                  Das erste Foto ist das Titelbild. Zum Sortieren ein Foto an die
                  gewünschte Position ziehen.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {images.map((img, index) => (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => {
                        dragItem.current = { apartmentId: apt.id, index };
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(apt.id, index)}
                      className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-stone-200 cursor-move"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
                      />
                      {index === 0 && (
                        <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold bg-[#c8a96e] text-white px-1.5 py-0.5 rounded">
                          Titelbild
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(apt.id, img.id)}
                        disabled={isBusy}
                        aria-label="Foto löschen"
                        className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity disabled:opacity-40"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isBusy && (
              <p className="mt-3 text-xs text-stone-400">Wird gespeichert…</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function UploadButton({
  apartmentId,
  disabled,
  onFiles,
}: {
  apartmentId: string;
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        id={`upload-${apartmentId}`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 bg-[#c8a96e] hover:bg-[#b8985d] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Fotos hochladen
      </button>
    </>
  );
}
