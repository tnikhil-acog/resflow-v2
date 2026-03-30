"use client";

import { useEffect } from "react";
import { initAmplitude } from "@/lib/amplitude";
import { usePageTracking } from "@/hooks/use-page-tracking";

export function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAmplitude();
  }, []);

  usePageTracking();

  return <>{children}</>;
}
