/**
 * LDAP Authentication Helper
 *
 * This module provides LDAP authentication functionality.
 * In production, replace the mock implementation with actual LDAP client.
 */

interface LDAPAuthResult {
  success: boolean;
  username?: string;
  error?: string;
}

/**
 * Authenticate user against LDAP server
 *
 * MOCK IMPLEMENTATION FOR TESTING:
 * - Simulates frontend sending validated username from LDAP
 * - Just checks if password is "test123" to simulate LDAP validation
 * - Returns the username if validated
 * - Backend will then check this username against DB to get user details
 *
 * @param username - LDAP username
 * @param password - User password (mock: use "test123" to pass validation)
 * @returns Authentication result with success status
 *
 * @example
 * const result = await authenticateLDAP('john.doe', 'test123');
 * if (result.success) {
 *   // LDAP validated, now fetch user from DB using username
 * }
 */
export async function authenticateLDAP(
  username: string,
  password: string,
): Promise<LDAPAuthResult> {
  try {
    // TODO: Replace with actual LDAP authentication
    // In production, this would call your LDAP server
    // Example using ldapjs or other LDAP client:
    //
    // const ldapClient = ldap.createClient({
    //   url: process.env.LDAP_URL
    // });
    //
    // await ldapClient.bind(
    //   `uid=${username},${process.env.LDAP_BASE_DN}`,
    //   password
    // );
    //
    // return { success: true, username };

    // ============================================
    // MOCK IMPLEMENTATION FOR TESTING
    // ============================================
    // Simulates LDAP validation where frontend sends username
    // after LDAP validates the user

    console.log(`[MOCK LDAP] Validating user: ${username}`);

    // Simulate LDAP authentication delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock validation: Use password "test123" for any username
    // This simulates the LDAP server validating the credentials
    if (username && password === "test123") {
      console.log(`[MOCK LDAP] ✓ User validated: ${username}`);
      return {
        success: true,
        username, // Return validated username
      };
    }

    console.log(`[MOCK LDAP] ✗ Invalid credentials for: ${username}`);
    return {
      success: false,
      error: "Invalid LDAP credentials (use password: test123 for testing)",
    };
  } catch (error) {
    console.error("LDAP authentication error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "LDAP authentication failed",
    };
  }
}

/**
 * Validate LDAP username format
 *
 * @param username - Username to validate
 * @returns true if valid format
 */
export function isValidLDAPUsername(username: string): boolean {
  // Add your LDAP username format validation rules
  // Example: alphanumeric with dots/underscores
  const ldapUsernameRegex = /^[a-zA-Z0-9._-]{3,50}$/;
  return ldapUsernameRegex.test(username);
}
