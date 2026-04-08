"use client";

import { useEffect, useRef } from "react";
import { useInView } from "@/hooks/useInView";

interface ContwiseMapsProps {
  resourceId: string;
  height?: string;
  className?: string;
}

export default function ContwiseMaps({
  resourceId,
  height = "400px",
  className = "",
}: ContwiseMapsProps) {
  const { ref: viewRef, inView } = useInView({
    rootMargin: "200px 0px",
    once: true,
  });
  const mapRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!inView || !mapRef.current) return;

    const el = mapRef.current;
    el.setAttribute("apikey", "osttirol");
    el.setAttribute("language", "de");
    el.setAttribute("resourceids", resourceId);
    el.setAttribute("rendermode", "detailOnly");
    el.setAttribute("themecolor", "#c8a96e");
    el.setAttribute("showsheet", "true");
    el.setAttribute("reduceddetailsheet", "true");
  }, [inView, resourceId]);

  return (
    <div
      ref={viewRef}
      className={`rounded-xl overflow-hidden border border-stone-200 ${className}`}
    >
      {inView ? (
        <contwise-maps
          ref={mapRef}
          style={{ height, display: "block", width: "100%" }}
        />
      ) : (
        <div
          className="bg-stone-100 animate-pulse flex items-center justify-center"
          style={{ height }}
        >
          <svg
            className="w-8 h-8 text-stone-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
