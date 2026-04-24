import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "studio_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_COOKIE_SECRET must be set (>=16 chars)");
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function verifyPassword(password: string): boolean {
  const stored = process.env.AUTH_PASSWORD_HASH;
  if (!stored || !stored.includes(":")) return false;
  const [salt, expectedHex] = stored.split(":");
  const expected = Buffer.from(expectedHex, "hex");
  const got = scryptSync(password, salt, expected.length);
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}

export async function createSession() {
  const issuedAt = Date.now().toString();
  const token = `${issuedAt}.${sign(issuedAt)}`;
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const [issuedAt, signature] = raw.split(".");
  if (!issuedAt || !signature) return false;
  if (sign(issuedAt) !== signature) return false;
  const age = Date.now() - Number(issuedAt);
  if (Number.isNaN(age) || age < 0 || age > MAX_AGE_SECONDS * 1000) return false;
  return true;
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}
