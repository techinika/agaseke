"use client";

import { useEffect } from "react";

const GA_ID = "G-6DP23NWS5P";

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
};

export default function DeferredAnalytics() {
  useEffect(() => {
    let loaded = false;
    let timer: number | undefined;

    const load = () => {
      if (loaded) return;
      loaded = true;

      const w = window as GtagWindow;
      w.dataLayer = w.dataLayer || [];
      w.gtag = (...args: unknown[]) => {
        w.dataLayer?.push(args);
      };
      w.gtag("js", new Date());
      w.gtag("config", GA_ID);

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(script);
    };

    const removeListeners = () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("scroll", onInteract);
    };

    const onInteract = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      removeListeners();
      load();
    };

    timer = window.setTimeout(() => {
      removeListeners();
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(load, { timeout: 2000 });
      } else {
        load();
      }
    }, 3500);

    window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
    window.addEventListener("keydown", onInteract, { once: true });
    window.addEventListener("scroll", onInteract, { once: true, passive: true });

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      removeListeners();
    };
  }, []);

  return null;
}
