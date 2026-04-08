"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

interface ImageGalleryProps {
  images: { src: string; alt: string }[];
  /** Grid layout: "2x2" (default) or "hero" (large first image + smaller grid) */
  layout?: "2x2" | "hero";
}

export default function ImageGallery({
  images,
  layout = "hero",
}: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % images.length : null
    );
  }, [images.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + images.length) % images.length : null
    );
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  if (images.length === 0) return null;

  return (
    <>
      {/* Grid */}
      {layout === "hero" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl overflow-hidden">
          {/* Main image */}
          <button
            onClick={() => openLightbox(0)}
            className="relative aspect-[4/3] sm:row-span-2 sm:aspect-auto sm:h-full cursor-pointer group"
          >
            <Image
              src={images[0].src}
              alt={images[0].alt}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>

          {/* Side images */}
          <div className="grid grid-cols-2 gap-2">
            {images.slice(1, 5).map((image, i) => (
              <button
                key={i}
                onClick={() => openLightbox(i + 1)}
                className="relative aspect-[4/3] cursor-pointer group"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                {/* "Show all" overlay on last visible image */}
                {i === 3 && images.length > 5 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      +{images.length - 5} Fotos
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-2xl overflow-hidden">
          {images.map((image, i) => (
            <button
              key={i}
              onClick={() => openLightbox(i)}
              className="relative aspect-[4/3] cursor-pointer group"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-label="Bildergalerie"
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Schließen"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Previous */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Vorheriges Bild"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Image */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[85vh] mx-16"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIndex].src}
              alt={images[lightboxIndex].alt}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Next */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Nächstes Bild"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
