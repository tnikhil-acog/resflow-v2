"use client";

import * as amplitude from "@amplitude/analytics-browser";
import { Identify } from "@amplitude/analytics-browser";

let initialized = false;

export function initAmplitude() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  amplitude.init(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY!, {
    fetchRemoteConfig: false,
    autocapture: false,
    serverUrl: `${window.location.origin}/api/amplitude`,
  });
}

export { Identify };
export default amplitude;
