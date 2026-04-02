import { NextRequest, NextResponse } from "next/server";

const AMPLITUDE_ENDPOINT = "https://api2.amplitude.com/2/httpapi";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const response = await fetch(AMPLITUDE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await response.text();
    return new NextResponse(data, { status: response.status });
  } catch {
    return NextResponse.json({ code: 0 }, { status: 200 });
  }
}
