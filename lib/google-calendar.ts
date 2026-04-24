import { google } from "googleapis";
import { getSettings, updateSettings } from "@/lib/settings";
import { peopleDetailLabel } from "@/lib/reservations-helpers";
import { TZ } from "@/lib/tz";
import type { ReservationWithSegments } from "@/db/schema";

export function buildOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthUrl(state: string): string {
  const client = buildOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
}

async function getAuthedCalendar() {
  const s = await getSettings();
  if (!s.googleRefreshToken) return null;
  const client = buildOAuthClient();
  client.setCredentials({ refresh_token: s.googleRefreshToken });
  return { calendar: google.calendar({ version: "v3", auth: client }), settings: s };
}

function eventBody(r: ReservationWithSegments) {
  const tagText = r.tags.length > 0 ? `\n태그: ${r.tags.join(", ")}` : "";
  const phoneText = r.customerPhone ? `\n연락처: ${r.customerPhone}` : "";
  const people = peopleDetailLabel(r.peopleSegments);
  const peopleText = `\n인원: ${people}`;
  return {
    summary: `[예약] ${r.customerName} (${people})`,
    description: `금액: ${r.totalAmount.toLocaleString()}원${peopleText}${phoneText}${tagText}${
      r.notes ? `\n\n${r.notes}` : ""
    }`,
    start: { dateTime: r.startAt.toISOString(), timeZone: TZ },
    end: { dateTime: r.endAt.toISOString(), timeZone: TZ },
  };
}

export async function pushCalendarEvent(r: ReservationWithSegments): Promise<string | null> {
  const ctx = await getAuthedCalendar();
  if (!ctx) return null;
  const calendarId = ctx.settings.googleCalendarId ?? "primary";
  const res = await ctx.calendar.events.insert({
    calendarId,
    requestBody: eventBody(r),
  });
  return res.data.id ?? null;
}

export async function updateCalendarEvent(eventId: string, r: ReservationWithSegments) {
  const ctx = await getAuthedCalendar();
  if (!ctx) return;
  const calendarId = ctx.settings.googleCalendarId ?? "primary";
  await ctx.calendar.events.update({
    calendarId,
    eventId,
    requestBody: eventBody(r),
  });
}

export async function deleteCalendarEvent(eventId: string) {
  const ctx = await getAuthedCalendar();
  if (!ctx) return;
  const calendarId = ctx.settings.googleCalendarId ?? "primary";
  await ctx.calendar.events.delete({ calendarId, eventId });
}

export async function exchangeCodeAndSaveToken(code: string) {
  const client = buildOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("refresh_token이 없습니다. Google 계정 연동을 해제한 뒤 다시 시도하세요.");
  }
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const me = await oauth2.userinfo.get();
  await updateSettings({
    googleRefreshToken: tokens.refresh_token,
    googleConnectedEmail: me.data.email ?? null,
    googleCalendarId: "primary",
  });
}

export async function disconnectGoogle() {
  await updateSettings({
    googleRefreshToken: null,
    googleConnectedEmail: null,
    googleCalendarId: null,
  });
}
