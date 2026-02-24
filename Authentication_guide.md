# Authentication Implementation Guide

## Restricting Access to LDAP + Google Login with @aganitha.ai Domain and Database Validation

**Date:** February 23, 2026  
**Project:** Aganitha UI Application  
**Purpose:** Comprehensive guide to implement enterprise authentication with LDAP and Google OAuth, restricted to @aganitha.ai domain with database user validation.

---

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Implementation Strategy](#implementation-strategy)
4. [Database Schema](#database-schema)
5. [Authentication Flow](#authentication-flow)
6. [Code Implementation](#code-implementation)
7. [Environment Configuration](#environment-configuration)
8. [Testing & Validation](#testing--validation)

---

## Overview

This guide explains how to configure your Next.js authentication system to:

- Support **two authentication methods**: LDAP and Google OAuth
- **Restrict access** to users with `@aganitha.ai` email addresses
- **Validate users** against your company database before granting access
- **Remove** unnecessary OAuth providers (GitHub, LinkedIn, OTP)

### Key Security Features

- Domain-level access control (@aganitha.ai only)
- Database-level user validation (pre-registered users only)
- LDAP directory integration for corporate authentication
- JWT-based session management with 7-day expiration

---

## Current Architecture

### Tech Stack

```
Frontend: Next.js 16.1.4 + React 19.2.3
Authentication: NextAuth.js 4.24.13
Database: SQLite (better-sqlite3)
LDAP Client: ldapjs 3.0.7
```

### Current Database Schema

Your application uses SQLite with the following tables:

#### `users` Table

```typescript
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Stores all authorized users in the system  
**Columns:**

- `id`: Unique identifier (UUID)
- `email`: User's email address (must be unique)
- `created_at`: Account creation timestamp

#### `otp_codes` Table

```typescript
CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  code TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Purpose:** Stores one-time passwords (OTP) for email-based authentication  
**Note:** Can be deprecated if removing OTP authentication

#### `allowed_emails` Table

```typescript
CREATE TABLE IF NOT EXISTS allowed_emails (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default entry:
INSERT OR IGNORE INTO allowed_emails (id, pattern)
VALUES ('default', '@aganitha\\.ai$');
```

**Purpose:** Stores regex patterns for allowed email domains

---

## Implementation Strategy

### Phase 1: Remove Unnecessary Providers

**Currently enabled:**

- ✅ Google OAuth
- ❌ GitHub OAuth (REMOVE)
- ❌ LinkedIn OAuth (REMOVE)
- ❌ OTP Email (REMOVE)
- ✅ LDAP (keep and enhance)

**Why:** Simplifies authentication flow and reduces OAuth app management complexity

### Phase 2: Enhance LDAP Provider

- Add database validation after successful LDAP bind
- Check if user exists in `users` table before granting access
- Construct email from LDAP username and domain

### Phase 3: Enhance Google Provider

- Add domain validation in `signIn` callback
- Add database validation in `signIn` callback
- Ensure only @aganitha.ai users can access

### Phase 4: Update Callbacks

- Modify `signIn` callback to validate users exist in database
- Remove provider-specific profile handling for removed OAuth providers

---

## Database Schema

### Current State (from `lib/db.ts`)

```typescript
import { join } from "path";

let db: any;

try {
  const Database = require("better-sqlite3");
  db = new Database(join(process.cwd(), "company.db"));

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS allowed_emails (
      id TEXT PRIMARY KEY,
      pattern TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO allowed_emails (id, pattern)
    VALUES ('default', '@aganitha\\.ai$');
  `);
} catch (error) {
  console.error("Database initialization error:", error);
  // Fallback mock database
  const mockDb = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === "prepare") {
          return () => ({
            get: () => null,
            all: () => [],
            run: () => ({ changes: 0 }),
            exec: () => undefined,
          });
        }
        if (prop === "exec") {
          return () => undefined;
        }
        return undefined;
      },
    },
  );
  db = mockDb;
}

export { db };
```

### Usage Example: Querying Users

```typescript
// Check if user exists
const user = db
  .prepare("SELECT * FROM users WHERE email = ?")
  .get("john@aganitha.ai");

// Get all users
const allUsers = db.prepare("SELECT * FROM users").all();

// Insert new user
const { randomUUID } = require("crypto");
db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(
  randomUUID(),
  "john@aganitha.ai",
);
```

---

## Authentication Flow

### Current Authentication Flow Diagram

```
User Initiates Login
        ↓
┌───────────────────────────────────────────────────┐
│  Frontend displays login options:                 │
│  - Google Sign-In                                 │
│  - LDAP Username/Password                         │
└───────────────────────────────────────────────────┘
        ↓
    User selects method
   ↙                 ↘
GOOGLE OAUTH         LDAP CREDENTIALS
   ↓                   ↓
Google Server      LDAP Server
validates token    validates credentials
   ↓                   ↓
┌──────────────────────────────────────────┐
│ NextAuth.js Credentials Provider         │
│ authorize() function                     │
│ - Processes credentials                  │
│ - Returns user object OR throws error    │
└──────────────────────────────────────────┘
   ↓
┌──────────────────────────────────────────┐
│ signIn() callback                        │
│ - Validates user is in database          │
│ - Validates @aganitha.ai domain (Google) │
│ - Returns true/false                     │
└──────────────────────────────────────────┘
   ↓
jwt() callback
│ - Adds user data to JWT token
│
session() callback
│ - Returns session with user info
↓
User authenticated & redirected to /success
```

### Proposed Enhanced Flow

```
User Initiates Login
        ↓
┌───────────────────────────────────┐
│ Login Options:                    │
│ ✓ Google Sign-In                  │
│ ✓ LDAP Username/Password          │
│ ✗ GitHub (removed)                │
│ ✗ LinkedIn (removed)              │
│ ✗ OTP (removed)                   │
└───────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│ GOOGLE OAUTH PATH                                       │
├─────────────────────────────────────────────────────────┤
│ 1. Google validates credentials                         │
│ 2. signIn callback:                                     │
│    a. Extract email: profile.email                      │
│    b. Check domain: must end with @aganitha.ai          │
│       └─ If NOT @aganitha.ai → REJECT ✗               │
│    c. Query database:                                   │
│       SELECT * FROM users WHERE email = ?              │
│       └─ If NOT in users table → REJECT ✗             │
│       └─ If in users table → ALLOW ✓                  │
│ 3. Return true/false                                    │
└─────────────────────────────────────────────────────────┘

OR

┌─────────────────────────────────────────────────────────┐
│ LDAP PATH                                               │
├─────────────────────────────────────────────────────────┤
│ 1. authorize() function:                                │
│    a. Extract username & password from credentials      │
│    b. Connect to LDAP server                            │
│    c. Attempt bind: uid=username,ou=people,dc=...      │
│       └─ If bind fails → REJECT ✗                      │
│    d. Construct email: username@aganitha.ai             │
│    e. Query database:                                   │
│       SELECT * FROM users WHERE email = ?              │
│       └─ If NOT in users table → REJECT ✗             │
│       └─ If in users table → RETURN user ✓            │
│ 2. Return user object / throw error                     │
└─────────────────────────────────────────────────────────┘

        ↓
┌─────────────────────────────┐
│ jwt() callback              │
│ - Store user.id in token    │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│ session() callback          │
│ - Add user.id to session    │
└─────────────────────────────┘
        ↓
User authenticated & redirected to /success
```

---

## Code Implementation

### File: `app/api/auth/[...nextauth]/route.ts`

This is the main authentication configuration file. Below is the current implementation with annotations:

#### Current Implementation

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github"; // ← REMOVE
import LinkedInProvider, { // ← REMOVE
  LinkedInProfile,
} from "next-auth/providers/linkedin";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
const ldap = require("ldapjs");

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GithubProvider({
      // ← REMOVE
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    LinkedInProvider({
      // ← REMOVE
      clientId: process.env.LINKEDIN_CLIENT_ID || "",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
      client: { token_endpoint_auth_method: "client_secret_post" },
      issuer: "https://www.linkedin.com",
      profile: (profile: LinkedInProfile) => ({
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
      }),
      wellKnown:
        "https://www.linkedin.com/oauth/.well-known/openid-configuration",
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
    }),
    CredentialsProvider({
      id: "verify-otp", // ← REMOVE
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        console.log("Authorizing with credentials:", credentials);

        if (!credentials?.email || !credentials?.otp || !credentials?.userId) {
          console.log("Missing credentials");
          throw new Error("Missing OTP credentials");
        }

        const result = db
          .prepare(
            `
          SELECT * FROM otp_codes
          WHERE user_id = ?
          AND code = ?
          AND expires_at > datetime('now')
          AND used = FALSE
          LIMIT 1
        `,
          )
          .get(credentials.userId, credentials.otp) as any;

        console.log("OTP query result:", result);

        if (!result) {
          console.log("Invalid OTP or expired");
          throw new Error("Invalid or expired OTP");
        }

        db.prepare(
          `
          UPDATE otp_codes
          SET used = TRUE
          WHERE id = ?
        `,
        ).run(result.id);

        const user = db
          .prepare("SELECT * FROM users WHERE id = ?")
          .get(credentials.userId) as any;

        console.log("User query result:", user);

        if (!user) {
          console.log("User not found");
          throw new Error("User not found");
        }

        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
    CredentialsProvider({
      id: "ldap",
      name: "LDAP",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log("Missing LDAP credentials");
          throw new Error("Missing LDAP credentials");
        }

        const ldapUrl = process.env.LDAP_URI || "ldap://ldap.aganitha.ai";
        const ldapUserDn =
          process.env.LDAP_USER_DN || "ou=people,dc=aganitha,dc=ai";
        const ldapDomain = process.env.LDAP_DOMAIN || "aganitha.ai";

        // OpenLDAP uses uid format
        const userDn = `uid=${credentials.username},${ldapUserDn}`;

        console.log(
          `Authenticating with LDAP at ${ldapUrl} using DN: ${userDn}`,
        );

        const client = ldap.createClient({
          url: ldapUrl,
          timeout: 5000,
          connectTimeout: 10000,
        });

        return new Promise((resolve, reject) => {
          client.bind(userDn, credentials.password, (error: any, res: any) => {
            if (error) {
              console.error("LDAP authentication failed:", error);
              client.unbind();
              reject(new Error("Invalid LDAP credentials"));
              return;
            }
            console.log(
              "LDAP authentication successful for:",
              credentials.username,
            );

            // Success - unbind and resolve
            client.unbind();
            resolve({
              id: credentials.username,
              email: `${credentials.username}@${ldapDomain}`,
              name: credentials.username,
            });
          });

          client.on("error", (err: any) => {
            console.error("LDAP connection error:", err);
            client.unbind();
            reject(new Error("LDAP server connection failed"));
          });
        });
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "verify-otp" || account?.provider === "ldap") {
        console.log(
          `${account.provider} provider detected; proceeding without profile check.`,
        );
        return true;
      }

      if (!account || !profile) {
        return false;
      }

      // Add custom profile data to the user object
      if (profile.email) {
        user.email = profile.email;
      }

      if (profile.name) {
        user.name = profile.name;
      }

      // Add provider-specific profile data
      if (account.provider === "github") {
        //@ts-expect-error
        user.githubUrl = profile.html_url;
      }

      if (account.provider === "linkedin") {
        //@ts-expect-error
        user.linkedinUrl = profile.publicProfileUrl;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      console.log("JWT callback invoked");
      console.log("Initial token:", token);
      if (user) {
        token.userId = user.id;
        //@ts-expect-error
        if (user.githubUrl) {
          //@ts-expect-error
          token.githubUrl = user.githubUrl;
        }
        //@ts-expect-error
        if (user.linkedinUrl) {
          //@ts-expect-error
          token.linkedinUrl = user.linkedinUrl;
        }
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback invoked");
      console.log("Token in session callback:", token);
      if (token && session.user) {
        (session.user as any).id = token.userId as string;
        if (token.githubUrl) {
          //@ts-expect-error
          session.user.githubUrl = token.githubUrl;
        }
        if (token.linkedinUrl) {
          //@ts-expect-error
          session.user.linkedinUrl = token.linkedinUrl;
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### Recommended Implementation (Enhanced)

After implementing the restrictions, here's what the enhanced version should look like:

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
const ldap = require("ldapjs");

export const authOptions: NextAuthOptions = {
  providers: [
    // GOOGLE OAUTH - With domain and database validation
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    // LDAP - With database validation
    CredentialsProvider({
      id: "ldap",
      name: "LDAP",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log("Missing LDAP credentials");
          throw new Error("Missing LDAP credentials");
        }

        const ldapUrl = process.env.LDAP_URI || "ldap://ldap.aganitha.ai";
        const ldapUserDn =
          process.env.LDAP_USER_DN || "ou=people,dc=aganitha,dc=ai";
        const ldapDomain = process.env.LDAP_DOMAIN || "aganitha.ai";

        const userDn = `uid=${credentials.username},${ldapUserDn}`;

        console.log(
          `Authenticating with LDAP at ${ldapUrl} using DN: ${userDn}`,
        );

        const client = ldap.createClient({
          url: ldapUrl,
          timeout: 5000,
          connectTimeout: 10000,
        });

        return new Promise((resolve, reject) => {
          client.bind(userDn, credentials.password, (error: any, res: any) => {
            if (error) {
              console.error("LDAP authentication failed:", error);
              client.unbind();
              reject(new Error("Invalid LDAP credentials"));
              return;
            }

            console.log(
              "LDAP authentication successful for:",
              credentials.username,
            );

            // Construct email
            const userEmail = `${credentials.username}@${ldapDomain}`;

            // *** NEW: Check if user exists in database ***
            const existingUser = db
              .prepare("SELECT id, email FROM users WHERE email = ?")
              .get(userEmail) as { id: string; email: string } | undefined;

            client.unbind();

            if (!existingUser) {
              console.error(
                `User ${userEmail} authenticated via LDAP but not found in database`,
              );
              reject(new Error("User not authorized in system"));
              return;
            }

            console.log(`User ${userEmail} authorized`);
            resolve({
              id: existingUser.id,
              email: existingUser.email,
              name: credentials.username,
            });
          });

          client.on("error", (err: any) => {
            console.error("LDAP connection error:", err);
            client.unbind();
            reject(new Error("LDAP server connection failed"));
          });
        });
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // LDAP: Already validated in authorize(), just allow
      if (account?.provider === "ldap") {
        console.log("LDAP authentication accepted");
        return true;
      }

      // GOOGLE: Validate domain and database
      if (account?.provider === "google") {
        console.log("Validating Google authentication");

        // Check if email exists and extract it
        if (!profile?.email) {
          console.error("Google profile missing email");
          return false;
        }

        const email = profile.email;

        // *** NEW: Validate @aganitha.ai domain ***
        if (!email.endsWith("@aganitha.ai")) {
          console.error(`Google login rejected: ${email} is not @aganitha.ai`);
          return false;
        }

        console.log(`Domain validation passed for ${email}`);

        // *** NEW: Check if user exists in database ***
        const existingUser = db
          .prepare("SELECT id, email FROM users WHERE email = ?")
          .get(email) as { id: string; email: string } | undefined;

        if (!existingUser) {
          console.error(
            `Google login rejected: ${email} not found in users table`,
          );
          return false;
        }

        console.log(`User ${email} authorized via Google`);

        // Set user data
        user.id = existingUser.id;
        user.email = existingUser.email;
        if (profile.name) {
          user.name = profile.name;
        }

        return true;
      }

      // Reject all other providers
      console.error(`Unknown provider: ${account?.provider}`);
      return false;
    },

    async jwt({ token, user, account }) {
      console.log("JWT callback invoked");
      if (user) {
        token.userId = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      console.log("Session callback invoked");
      if (token && session.user) {
        (session.user as any).id = token.userId as string;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### File: `lib/db.ts`

Database initialization and utilities (no changes needed, shown for reference):

```typescript
import { join } from "path";

let db: any;

try {
  const Database = require("better-sqlite3");
  db = new Database(join(process.cwd(), "company.db"));

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS allowed_emails (
      id TEXT PRIMARY KEY,
      pattern TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO allowed_emails (id, pattern)
    VALUES ('default', '@aganitha\\.ai$');
  `);
} catch (error) {
  console.error("Database initialization error:", error);
  const mockDb = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === "prepare") {
          return () => ({
            get: () => null,
            all: () => [],
            run: () => ({ changes: 0 }),
            exec: () => undefined,
          });
        }
        if (prop === "exec") {
          return () => undefined;
        }
        return undefined;
      },
    },
  );
  db = mockDb;
}

export { db };
```

### File: `lib/auth.ts`

Authentication utilities (shown for reference, can be simplified after removing OTP):

```typescript
import { db } from "./db";
import { randomUUID } from "crypto";

/**
 * Check if email matches allowed patterns in database
 */
export function isEmailAllowed(email: string) {
  const patterns = db
    .prepare(
      `
    SELECT pattern FROM allowed_emails
  `,
    )
    .all() as { pattern: string }[];

  return patterns.some(({ pattern }) => {
    const regex = new RegExp(pattern);
    return regex.test(email);
  });
}

/**
 * Check if user exists in database
 */
export function userExists(email: string): boolean {
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);

  return !!user;
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string) {
  return db
    .prepare("SELECT id, email, created_at FROM users WHERE email = ?")
    .get(email);
}

// ... (OTP functions can be removed)
```

---

## Environment Configuration

### Required Environment Variables

Create or update your `.env.local` file with the following:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LDAP Configuration
LDAP_URI=ldap://ldap.aganitha.ai
LDAP_USER_DN=ou=people,dc=aganitha,dc=ai
LDAP_DOMAIN=aganitha.ai

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

### Environment Variables Explained

| Variable               | Purpose                       | Example                                             |
| ---------------------- | ----------------------------- | --------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | Google OAuth app ID           | `123456789.apps.googleusercontent.com`              |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret           | `GOCSPX-...`                                        |
| `LDAP_URI`             | LDAP server URL               | `ldap://ldap.aganitha.ai`                           |
| `LDAP_USER_DN`         | Base DN for users             | `ou=people,dc=aganitha,dc=ai`                       |
| `LDAP_DOMAIN`          | Domain for email construction | `aganitha.ai`                                       |
| `NEXTAUTH_URL`         | Your application URL          | `http://localhost:3000` or `https://yourdomain.com` |
| `NEXTAUTH_SECRET`      | Secret for JWT signing        | Generate with: `openssl rand -hex 32`               |

### How to Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Google+ API"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret

### Generating NEXTAUTH_SECRET

```bash
# Run this command to generate a secure secret
openssl rand -hex 32

# Output example:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## Testing & Validation

### Test Scenarios

#### Test 1: LDAP Authentication with Valid User

**Steps:**

1. Navigate to login page
2. Select "LDAP" authentication
3. Enter username and password (must exist in LDAP)
4. Submit

**Expected Results:**

- ✅ User exists in `users` table with matching email
- ✅ Redirected to `/success` page
- ✅ Session contains user data

**Failure Scenarios:**

- ❌ Invalid credentials → "Invalid LDAP credentials"
- ❌ User not in `users` table → "User not authorized in system"
- ❌ LDAP server unavailable → "LDAP server connection failed"

#### Test 2: LDAP Authentication with Unregistered User

**Steps:**

1. Navigate to login page
2. Select "LDAP" authentication
3. Enter username and password (valid in LDAP but not in users table)
4. Submit

**Expected Results:**

- ❌ Login fails with "User not authorized in system"
- ❌ User NOT created in `users` table
- ❌ Session NOT created

#### Test 3: Google Authentication with @aganitha.ai Email

**Steps:**

1. Navigate to login page
2. Click "Sign in with Google"
3. Authenticate with @aganitha.ai email account
4. Authorize application

**Expected Results:**

- ✅ User must exist in `users` table
- ✅ Redirected to `/success` page
- ✅ Session contains user data

#### Test 4: Google Authentication with Non-@aganitha.ai Email

**Steps:**

1. Navigate to login page
2. Click "Sign in with Google"
3. Authenticate with non-Aganitha email (e.g., gmail.com)
4. Authorize application

**Expected Results:**

- ❌ Login fails silently
- ❌ Error: "Email domain not authorized"
- ❌ Redirected back to login

#### Test 5: Google Authentication with Unregistered User

**Steps:**

1. Navigate to login page
2. Click "Sign in with Google"
3. Authenticate with valid @aganitha.ai email (not in users table)
4. Authorize application

**Expected Results:**

- ❌ Login fails
- ❌ Error: "User not found in system"
- ❌ User NOT created automatically

### Database Testing Commands

```bash
# Connect to SQLite database
sqlite3 company.db

# View all users
SELECT * FROM users;

# Insert a test user
INSERT INTO users (id, email) VALUES ('test-id', 'john@aganitha.ai');

# Check if user exists
SELECT * FROM users WHERE email = 'john@aganitha.ai';

# Count total users
SELECT COUNT(*) FROM users;

# Delete test user
DELETE FROM users WHERE email = 'john@aganitha.ai';
```

### Browser Console Debugging

Check the browser console for NextAuth logs:

```javascript
// Enable debug mode
localStorage.setItem("next-auth.debug", true);
```

### Server-Side Logging

Monitor the server logs for authentication events:

```
$ npm run dev

Authenticating with LDAP at ldap://ldap.aganitha.ai using DN: uid=john,ou=people,dc=aganitha,dc=ai
LDAP authentication successful for: john
Validating Google authentication
Domain validation passed for john@aganitha.ai
User john@aganitha.ai authorized via Google
JWT callback invoked
Session callback invoked
```

---

## Deployment Checklist

- [ ] Remove GitHub, LinkedIn, and OTP provider code
- [ ] Update LDAP authorize function to validate users in database
- [ ] Update Google signIn callback to validate domain and database
- [ ] Set production environment variables (Google OAuth, LDAP, NEXTAUTH_SECRET)
- [ ] Pre-populate `users` table with authorized employees
- [ ] Test all authentication flows in staging environment
- [ ] Update .env.production with correct NEXTAUTH_URL
- [ ] Verify SSL certificate (required for OAuth)
- [ ] Test login flow end-to-end
- [ ] Monitor authentication logs post-deployment

---

## Security Considerations

### 1. Database User Management

**Approach:** Manual registration of authorized users

```sql
-- Approved employees are added to the database
INSERT INTO users (id, email)
VALUES ('emp-001', 'john@aganitha.ai');
```

**Recommendation:** Implement an admin panel to manage authorized users

### 2. LDAP Connection Security

- Always use `ldaps://` (LDAP over SSL) in production
- Set appropriate timeouts (currently 5s)
- Implement connection pooling for performance
- Never log passwords in production

**Update:**

```typescript
const ldapUrl = process.env.LDAP_URI || "ldaps://ldap.aganitha.ai"; // Use ldaps://
```

### 3. Session Security

- JWT tokens expire after 7 days
- Enable secure cookies in production
- Use HTTPS only
- Implement CSRF protection (built into NextAuth)

### 4. OAuth 2.0 Security

- Store secrets in environment variables only
- Rotate secrets regularly
- Use PKCE for additional security
- Monitor suspicious login attempts

### 5. Rate Limiting

**Consider implementing:**

```typescript
// Limit failed login attempts
// Implement exponential backoff
// Log suspicious patterns
```

---

## Troubleshooting Guide

### Issue: "Invalid LDAP credentials"

**Causes:**

- Wrong username or password
- Incorrect LDAP server URL
- Incorrect DN format

**Solution:**

```bash
# Test LDAP connectivity
ldapsearch -H ldap://ldap.aganitha.ai -D "uid=testuser,ou=people,dc=aganitha,dc=ai" -W -b "ou=people,dc=aganitha,dc=ai"
```

### Issue: "User not authorized in system"

**Cause:** User authenticated but not in `users` table

**Solution:**

```sql
-- Add user to database
INSERT INTO users (id, email) VALUES ('uuid-here', 'john@aganitha.ai');
```

### Issue: Google login shows error page

**Causes:**

- Invalid OAuth credentials
- Wrong redirect URI
- NEXTAUTH_URL not set correctly

**Solution:**

```bash
# Verify environment variables
echo $GOOGLE_CLIENT_ID
echo $NEXTAUTH_URL

# Check OAuth redirect URIs in Google Cloud Console
# Should include: {NEXTAUTH_URL}/api/auth/callback/google
```

### Issue: "LDAP server connection failed"

**Causes:**

- LDAP server is down
- Network connectivity issue
- Firewall blocking port 389

**Solution:**

```bash
# Test connectivity
telnet ldap.aganitha.ai 389

# Check LDAP logs
ssh ldap.aganitha.ai
tail -f /var/log/slapd.log
```

---

## Summary of Changes

| Component      | Current     | Recommended         | Reason             |
| -------------- | ----------- | ------------------- | ------------------ |
| Google OAuth   | ✓ Allow all | ✓ @aganitha.ai only | Domain restriction |
| GitHub         | ✓ Enabled   | ✗ Removed           | Unnecessary        |
| LinkedIn       | ✓ Enabled   | ✗ Removed           | Unnecessary        |
| OTP            | ✓ Enabled   | ✗ Removed           | Unnecessary        |
| LDAP           | ✓ Enabled   | ✓ Enhanced          | Add DB validation  |
| Database Check | ✗ No        | ✓ Yes               | Security control   |
| Domain Check   | ✗ No        | ✓ Yes (Google)      | Security control   |

---

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [ldapjs Documentation](https://github.com/ldapjs/node-ldapjs)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [SQLite Best Practices](https://www.sqlite.org/bestpractice.html)
- [JWT Security](https://tools.ietf.org/html/rfc7519)

---

**Document Version:** 1.0  
**Last Updated:** February 23, 2026  
**Author:** Authentication Documentation  
**Status:** Ready for Implementation
