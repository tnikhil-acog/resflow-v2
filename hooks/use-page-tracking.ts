"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import amplitude from "@/lib/amplitude";

export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    amplitude.track("page_view", { page: pathname });
  }, [pathname]);
}
