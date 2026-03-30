"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/loading-spinner";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const hasProcessedCallback = useRef(false);

  useEffect(() => {
    if (hasProcessedCallback.current) {
      return;
    }
    hasProcessedCallback.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      router.replace(
        `/login?error=${encodeURIComponent("Google authentication failed. Please try again.")}`,
      );
      return;
    }

    fetch(`/api/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.token && data.user) {
          login(data.token, data.user, "google");
          router.replace("/tasks");
        } else {
          const message = data.error ?? "Authentication failed. Please try again.";
          router.replace(`/login?error=${encodeURIComponent(message)}`);
        }
      })
      .catch(() => {
        router.replace(
          `/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`,
        );
      });
  }, [login, router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner />
        <p className="text-muted-foreground text-sm">Completing Google sign in...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
