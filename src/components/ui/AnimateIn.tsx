"use client";

import { useInView } from "@/hooks/useInView";

interface AnimateInProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in ms before animation starts */
  delay?: number;
}

export default function AnimateIn({
  children,
  className = "",
  delay = 0,
}: AnimateInProps) {
  const { ref, inView } = useInView({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`animate-in ${inView ? "in-view" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
