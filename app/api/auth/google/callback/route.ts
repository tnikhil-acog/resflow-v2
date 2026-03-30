import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createToken, mapDbRoleToApp, type DbRole } from "@/lib/auth";

const STATE_COOKIE = "google_oauth_state";

function clearStateCookie(response: NextResponse) {
  response.cookies.set({
    name: STATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function errorResponse(message: string, status: number) {
  const response = NextResponse.json({ error: message }, { status });
  clearStateCookie(response);
  return response;
}

function getGoogleConfig() {
  const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    process.env.GOOGLE_CALLBACK_URL ||
    `${baseUrl}/google-callback`;
  const allowedDomain = (
    process.env.GOOGLE_ALLOWED_DOMAIN ||
    process.env.AUTH_ALLOWED_GOOGLE_DOMAIN ||
    "aganitha.ai"
  ).toLowerCase();

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    allowedDomain,
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const expectedState = req.cookies.get(STATE_COOKIE)?.value;

    if (!code || !state) {
      return errorResponse("Missing Google OAuth callback parameters.", 400);
    }

    if (!expectedState || state !== expectedState) {
      return errorResponse("Invalid Google OAuth state. Please try signing in again.", 401);
    }

    const config = getGoogleConfig();

    if (!config) {
      console.error(
        "[GOOGLE_OAUTH] Missing required Google env config (client id/secret)",
      );
      return errorResponse("Google login is not configured. Please contact administrator.", 500);
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      return errorResponse("Google token exchange failed. Please try again.", 401);
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return errorResponse("Google did not return an access token.", 401);
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      cache: "no-store",
    });

    if (!profileResponse.ok) {
      return errorResponse("Unable to fetch Google profile. Please try again.", 401);
    }

    const profile = (await profileResponse.json()) as {
      email?: string;
      email_verified?: boolean;
    };

    const email = profile.email?.trim().toLowerCase();
    if (!email || !profile.email_verified) {
      return errorResponse("Google account email is not verified.", 403);
    }

    if (!email.endsWith(`@${config.allowedDomain}`)) {
      return errorResponse("Only approved company Google accounts are allowed.", 403);
    }

    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(sql`LOWER(${schema.employees.email}) = ${email}`)
      .limit(1);

    if (!employee) {
      return errorResponse(
        "Your account is not registered in ResFlow. Contact HR to request access.",
        403,
      );
    }

    if (employee.status !== "ACTIVE") {
      return errorResponse(
        `Account is ${employee.status}. Please contact your administrator.`,
        403,
      );
    }

    const token = await createToken({
      id: employee.id,
      employee_code: employee.employee_code,
      ldap_username: employee.ldap_username,
      employee_role: mapDbRoleToApp(employee.employee_role as DbRole),
      full_name: employee.full_name,
      email: employee.email,
    });

    const response = NextResponse.json({
      token,
      user: {
        id: employee.id,
        employee_code: employee.employee_code,
        ldap_username: employee.ldap_username,
        full_name: employee.full_name,
        email: employee.email,
        employee_type: employee.employee_type,
        employee_role: mapDbRoleToApp(employee.employee_role as DbRole),
        employee_design: employee.employee_design,
        status: employee.status,
      },
    });

    clearStateCookie(response);
    return response;
  } catch (error) {
    console.error("[GOOGLE_OAUTH] Callback error:", error);
    return errorResponse("Authentication failed. Please try again.", 500);
  }
}
