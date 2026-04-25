import type { PeopleSegment } from "@/db/schema";
import { splitDayNightHoursFromDates } from "@/lib/tz";

const VAT_RATE = 0.1;

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (60 * 60 * 1000);
}

export function computeExtraCharge(
  segments: { startAt: Date; endAt: Date; peopleCount: number }[],
  minPeople: number,
  extraPerPersonHourlyRate: number,
): number {
  let total = 0;
  for (const seg of segments) {
    const segHours = hoursBetween(seg.startAt, seg.endAt);
    const extraPeople = Math.max(0, seg.peopleCount - minPeople);
    total += Math.round(segHours * extraPeople * extraPerPersonHourlyRate);
  }
  return total;
}

export type ReservationAmounts = {
  baseAmount: number;
  extraAmount: number;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  commissionAmount: number;
};

export function computeReservationAmounts(args: {
  startAt: Date;
  endAt: Date;
  dayHourlyRate: number;
  nightHourlyRate: number;
  segments: { startAt: Date; endAt: Date; peopleCount: number }[];
  minPeople: number;
  extraPerPersonHourlyRate: number;
  taxInvoice: boolean;
  commissionPct: number;
}): ReservationAmounts {
  const { dayHours, nightHours } = splitDayNightHoursFromDates(
    args.startAt,
    args.endAt,
  );
  const baseAmount = Math.round(
    dayHours * args.dayHourlyRate + nightHours * args.nightHourlyRate,
  );
  const extraAmount = computeExtraCharge(
    args.segments,
    args.minPeople,
    args.extraPerPersonHourlyRate,
  );
  const subtotalAmount = baseAmount + extraAmount;
  const vatAmount = args.taxInvoice
    ? Math.round(subtotalAmount * VAT_RATE)
    : 0;
  const commissionAmount = Math.round(
    (subtotalAmount * args.commissionPct) / 100,
  );
  return {
    baseAmount,
    extraAmount,
    subtotalAmount,
    vatAmount,
    totalAmount: subtotalAmount + vatAmount,
    commissionAmount,
  };
}

export function peopleLabel(segments: PeopleSegment[]): string {
  if (segments.length === 0) return "—";
  const counts = segments.map((s) => s.peopleCount);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (min === max) return `${min}명`;
  return `${min}~${max}명`;
}

export function peopleDetailLabel(segments: PeopleSegment[]): string {
  if (segments.length <= 1) return peopleLabel(segments);
  return segments.map((s) => `${s.peopleCount}명`).join(" → ");
}
