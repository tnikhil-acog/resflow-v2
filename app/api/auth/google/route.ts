import { NextResponse } from "next/server";

const STATE_COOKIE = "google_oauth_state";

function getGoogleConfig() {
  const baseUrl = (process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/").replace(
    /\/$/,
    "",
  );
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    process.env.GOOGLE_CALLBACK_URL ||
    `${baseUrl}/google-callback`;

  if (!clientId) {
    return null;
  }

  return { clientId, redirectUri };
}

export async function GET(request: Request) {
  const config = getGoogleConfig();

  if (!config) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Google login is not configured. Please contact administrator.");
    return NextResponse.redirect(loginUrl);
  }

  const state = crypto.randomUUID().replace(/-/g, "");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
