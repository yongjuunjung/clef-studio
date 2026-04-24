import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google-calendar";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/login", process.env.APP_BASE_URL ?? "http://localhost:3000"));
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID/SECRET이 설정되지 않았습니다." },
      { status: 500 },
    );
  }
  const url = getAuthUrl("connect");
  return NextResponse.redirect(url);
}
