"use client";

import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  /** Only trigger once (default: true) */
  once?: boolean;
}

export function useInView({ threshold = 0.1, rootMargin = "0px 0px -80px 0px", once = true }: UseInViewOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.unobserve(element);
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, once]);

  return { ref, inView };
}
