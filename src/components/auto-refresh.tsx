"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  intervalMs?: number;
}

export function AutoRefresh({
  intervalMs = 45000,
}: AutoRefreshProps): null {
  const router = useRouter();
  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    function start(): void {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        if (cancelled) return;
        router.refresh();
      }, intervalMs);
    }
    function stop(): void {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }

    function onVis(): void {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    }

    document.addEventListener("visibilitychange", onVis);
    if (document.visibilityState === "visible") start();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [router, intervalMs]);
  return null;
}
