"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until auth state is restored from storage before redirect checks.
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (requiredRoles.length > 0 && user) {
      // Check if user has required role
      const hasRequiredRole = requiredRoles.includes(user.employee_role);
      if (!hasRequiredRole) {
        // Redirect to analytics if user doesn't have required role
        router.push("/analytics");
      }
    }
  }, [isAuthenticated, isLoading, user, router, pathname, requiredRoles]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.includes(user.employee_role);
    if (!hasRequiredRole) {
      return null;
    }
  }

  return <>{children}</>;
}
