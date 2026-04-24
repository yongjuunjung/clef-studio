import type { PeopleSegment } from "@/db/schema";

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
