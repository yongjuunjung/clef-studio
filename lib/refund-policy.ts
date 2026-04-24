import { differenceInCalendarDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { TZ } from "@/lib/tz";

/** 예약 시작일 기준 (로컬 캘린더 일자) 까지 며칠 남았는지. 당일=0, 전일=1 */
export function daysUntilReservation(
  reservationStart: Date,
  now: Date,
  tz: string = TZ,
): number {
  return differenceInCalendarDays(
    toZonedTime(reservationStart, tz),
    toZonedTime(now, tz),
  );
}

/** 규정: 7일 이상 전 100%, 6~2일 전 50%, 1일 전~경과 0% */
export function refundRateForDaysBefore(days: number): number {
  if (days >= 7) return 100;
  if (days >= 2) return 50;
  return 0;
}

export function describeRefundRule(days: number): string {
  if (days >= 7) return "예약일 7일 이상 전 · 전액 환불";
  if (days >= 2) return "예약일 6~2일 전 · 50% 환불";
  if (days === 1) return "예약 전일 · 환불 불가";
  if (days === 0) return "예약 당일 · 환불 불가";
  return "예약일 경과 · 환불 불가";
}

export function computeRefund(
  reservationStart: Date,
  totalAmount: number,
  now: Date = new Date(),
  tz: string = TZ,
): { daysBefore: number; rate: number; amount: number; rule: string } {
  const daysBefore = daysUntilReservation(reservationStart, now, tz);
  const rate = refundRateForDaysBefore(daysBefore);
  const amount = Math.round((totalAmount * rate) / 100);
  return { daysBefore, rate, amount, rule: describeRefundRule(daysBefore) };
}
