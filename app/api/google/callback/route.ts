import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeAndSaveToken } from "@/lib/google-calendar";
import { isAuthenticated } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const settingsUrl = new URL("/settings", request.url);

  if (error) {
    settingsUrl.searchParams.set("google_error", error);
    return NextResponse.redirect(settingsUrl);
  }
  if (!code) {
    settingsUrl.searchParams.set("google_error", "no_code");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    await exchangeCodeAndSaveToken(code);
    settingsUrl.searchParams.set("google", "connected");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    settingsUrl.searchParams.set("google_error", msg);
  }
  return NextResponse.redirect(settingsUrl);
}
