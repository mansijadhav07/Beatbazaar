"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ScrollReveal({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !("IntersectionObserver" in window)) return;
    if (container.getBoundingClientRect().top <= window.innerHeight) return;

    const revealItems = container.querySelectorAll<HTMLElement>("h2, p, img, .beat-card");
    revealItems.forEach((item, index) => {
      if (index >= 6) return;
      item.dataset.revealItem = "true";
      item.style.setProperty("--reveal-index", String(index));
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        container.dataset.visible = "true";
        observer.unobserve(container);
      },
      { threshold: 0.08 }
    );
    container.dataset.ready = "true";
    container.dataset.visible = "false";
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="scroll-reveal">
      {children}
    </div>
  );
}
