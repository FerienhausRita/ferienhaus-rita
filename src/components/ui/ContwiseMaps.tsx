"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "@/hooks/useInView";

const SCRIPT_URL = "https://phoenix.contwise.io/webcomponent.bundle.js";

// Global promise so the script is only loaded once across all instances
let scriptPromise: Promise<void> | null = null;

function loadContwiseScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.defer = true;
    script.charset = "UTF-8";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Contwise script failed to load"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!inView) return;

    let cancelled = false;

    loadContwiseScript().then(() => {
      if (cancelled || !containerRef.current) return;
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [inView]);

  useEffect(() => {
    if (!ready || !containerRef.current) return;

    // Clear any previous content
    containerRef.current.innerHTML = "";

    // Create element imperatively with all attributes set before DOM insertion
    const el = document.createElement("contwise-maps");
    el.setAttribute("apikey", "osttirol");
    el.setAttribute("language", "de");
    el.setAttribute("resourceids", resourceId);
    el.setAttribute("rendermode", "detailOnly");
    el.setAttribute("themecolor", "#c8a96e");
    el.setAttribute("showsheet", "true");
    el.setAttribute("reduceddetailsheet", "true");
    el.style.height = height;
    el.style.display = "block";
    el.style.width = "100%";

    // Append – connectedCallback fires here, attributes are already set
    containerRef.current.appendChild(el);
  }, [ready, resourceId, height]);

  return (
    <div
      ref={viewRef}
      className={`rounded-xl overflow-hidden border border-stone-200 ${className}`}
    >
      <div ref={containerRef}>
        {!ready && (
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
    </div>
  );
}
