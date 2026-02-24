"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface User {
  id: string;
  employee_code: string;
  ldap_username: string;
  full_name?: string;
  email?: string;
  employee_role: "employee" | "project_manager" | "hr_executive";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userInfo = localStorage.getItem("user_info");

    if (token && userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse user info:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_info");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user_info", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.employee_role);
  };

  /**
   * Fetch wrapper that automatically handles token expiration
   * Redirects to login page if token is expired (401 response)
   */
  const authenticatedFetch = async (
    url: string,
    options?: RequestInit,
  ): Promise<Response> => {
    const token = localStorage.getItem("auth_token");

    // Add authorization header
    const headers = {
      ...options?.headers,
      Authorization: token ? `Bearer ${token}` : "",
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token expiration
    if (response.status === 401) {
      toast.error("Session Expired", {
        description: "Your session has expired. Please login again.",
      });
      logout();
      router.push("/login");
      throw new Error("Session expired");
    }

    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        hasRole,
        authenticatedFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
