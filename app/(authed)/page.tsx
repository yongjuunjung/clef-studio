import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listReservationsInMonth } from "@/lib/reservations";
import { peopleLabel } from "@/lib/reservations-helpers";
import { fmtTimeRange, formatKRW, TZ } from "@/lib/tz";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import type { ReservationWithSegments } from "@/db/schema";

type SearchParams = Promise<{ y?: string; m?: string }>;

function buildMonthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const dayOfWeek = first.getUTCDay();
  const gridStart = new Date(first);
  gridStart.setUTCDate(1 - dayOfWeek);
  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

function groupByDay(reservations: ReservationWithSegments[]) {
  const map = new Map<string, ReservationWithSegments[]>();
  for (const r of reservations) {
    const key = formatInTimeZone(r.startAt, TZ, "yyyy-MM-dd");
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return map;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { y, m } = await searchParams;
  const now = toZonedTime(new Date(), TZ);
  const year = Number(y) || now.getFullYear();
  const month = Number(m) || now.getMonth() + 1;

  const reservations = await listReservationsInMonth(year, month);
  const byDay = groupByDay(reservations);
  const grid = buildMonthGrid(year, month);
  const totalAmount = reservations.reduce(
    (s, r) => (r.status === "cancelled" ? s : s + r.totalAmount),
    0,
  );
  const activeCount = reservations.filter(
    (r) => r.status !== "cancelled",
  ).length;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>
              {year}년 {month}월
            </CardTitle>
            <div className="flex items-center gap-1">
              <Link href={`/?y=${prevYear}&m=${prevMonth}`}>
                <Button size="sm" variant="outline">
                  ‹
                </Button>
              </Link>
              <Link href="/">
                <Button size="sm" variant="outline">
                  오늘
                </Button>
              </Link>
              <Link href={`/?y=${nextYear}&m=${nextMonth}`}>
                <Button size="sm" variant="outline">
                  ›
                </Button>
              </Link>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              이번 달 {activeCount}건
              {reservations.length !== activeCount
                ? ` (취소 ${reservations.length - activeCount})`
                : ""}
            </div>
            <div className="text-lg font-semibold">{formatKRW(totalAmount)}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden border">
            {weekdays.map((d, i) => (
              <div
                key={d}
                className={`bg-card text-xs font-medium text-center py-2 ${
                  i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""
                }`}
              >
                {d}
              </div>
            ))}
            {grid.flat().map((day) => {
              const dayKey = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
              const isCurrentMonth = day.getUTCMonth() + 1 === month;
              const items = byDay.get(dayKey) ?? [];
              const dow = day.getUTCDay();
              const todayKey = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
              const isToday = dayKey === todayKey;
              return (
                <div
                  key={dayKey}
                  className={`bg-card min-h-[110px] p-2 relative ${
                    !isCurrentMonth ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Link
                      href={`/reservations/new?date=${dayKey}`}
                      className={`text-xs font-medium ${
                        isToday
                          ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                          : dow === 0
                            ? "text-red-500"
                            : dow === 6
                              ? "text-blue-500"
                              : ""
                      }`}
                    >
                      {day.getUTCDate()}
                    </Link>
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((r) => (
                      <Link
                        key={r.id}
                        href={`/reservations/${r.id}`}
                        className={`block text-[11px] rounded px-1 py-0.5 truncate ${
                          r.status === "cancelled"
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-primary/10 hover:bg-primary/20"
                        }`}
                      >
                        <span className="font-mono">
                          {formatInTimeZone(r.startAt, TZ, "HH:mm")}
                        </span>{" "}
                        {r.customerName}
                      </Link>
                    ))}
                    {items.length > 3 ? (
                      <div className="text-[10px] text-muted-foreground">
                        +{items.length - 3}건
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {reservations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">이번 달 예약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reservations.map((r) => (
              <Link
                key={r.id}
                href={`/reservations/${r.id}`}
                className={`flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded ${
                  r.status === "cancelled" ? "opacity-50 line-through" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="font-mono text-xs text-muted-foreground w-36">
                    {formatInTimeZone(r.startAt, TZ, "MM-dd")} ·{" "}
                    {fmtTimeRange(r.startAt, r.endAt)}
                  </div>
                  <div>
                    {r.customerName}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {peopleLabel(r.peopleSegments)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {r.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="font-mono text-sm">
                  {formatKRW(r.totalAmount)}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
