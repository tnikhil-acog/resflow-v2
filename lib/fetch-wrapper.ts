/**
 * Centralized fetch wrapper for API calls
 * Automatically handles token expiration and redirects to login
 *
 * Usage in components:
 *
 * import { useAuth } from "@/lib/auth-context";
 *
 * function MyComponent() {
 *   const { authenticatedFetch } = useAuth();
 *
 *   const fetchData = async () => {
 *     try {
 *       const response = await authenticatedFetch("/api/endpoint");
 *       if (!response.ok) {
 *         throw new Error("Request failed");
 *       }
 *       const data = await response.json();
 *       return data;
 *     } catch (error) {
 *       // Handle error (session expired errors are already handled)
 *       if (error.message !== "Session expired") {
 *         // Handle other errors
 *       }
 *     }
 *   };
 * }
 */

export {};
