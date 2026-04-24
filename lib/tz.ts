import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

export const TZ = process.env.APP_TIMEZONE ?? "Asia/Seoul";

export function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const iso = `${dateStr}T${timeStr}:00`;
  return fromZonedTime(iso, TZ);
}

export function toLocalDateTimeInputs(d: Date): { date: string; time: string } {
  const zoned = toZonedTime(d, TZ);
  return {
    date: format(zoned, "yyyy-MM-dd"),
    time: format(zoned, "HH:mm"),
  };
}

export function fmtDateTime(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd HH:mm");
}

export function fmtDate(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

export function fmtTimeRange(start: Date, end: Date): string {
  return `${formatInTimeZone(start, TZ, "HH:mm")} – ${formatInTimeZone(end, TZ, "HH:mm")}`;
}

export function durationHours(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return ms / (60 * 60 * 1000);
}

export function formatDurationHours(hours: number): string {
  if (Number.isInteger(hours)) return `${hours}시간`;
  return `${hours.toFixed(1)}시간`;
}

export function monthRange(year: number, month: number): { start: Date; end: Date } {
  const startLocal = `${year}-${String(month).padStart(2, "0")}-01T00:00:00`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endLocal = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00`;
  return {
    start: fromZonedTime(startLocal, TZ),
    end: fromZonedTime(endLocal, TZ),
  };
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}

export function minutesToTimeStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 18;

export function splitDayNightMinutes(
  startMin: number,
  endMin: number,
): { dayMin: number; nightMin: number } {
  const dayStart = DAY_START_HOUR * 60;
  const dayEnd = DAY_END_HOUR * 60;
  const dayOverlap = Math.max(
    0,
    Math.min(endMin, dayEnd) - Math.max(startMin, dayStart),
  );
  const totalMin = Math.max(0, endMin - startMin);
  return { dayMin: dayOverlap, nightMin: totalMin - dayOverlap };
}

export function splitDayNightHoursFromDates(
  start: Date,
  end: Date,
): { dayHours: number; nightHours: number } {
  const startStr = formatInTimeZone(start, TZ, "HH:mm");
  const endStr = formatInTimeZone(end, TZ, "HH:mm");
  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin === 0) endMin = 24 * 60;
  const { dayMin, nightMin } = splitDayNightMinutes(startMin, endMin);
  return { dayHours: dayMin / 60, nightHours: nightMin / 60 };
}

export function isNightHour(hour: number): boolean {
  return hour >= DAY_END_HOUR || hour < DAY_START_HOUR;
}
