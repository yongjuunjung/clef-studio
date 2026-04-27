import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  listReservations,
  listReservationsInMonth,
} from "@/lib/reservations";
import { peopleLabel } from "@/lib/reservations-helpers";
import {
  dayRange,
  fmtHourRangeCompact,
  fmtTimeRange,
  formatKRW,
  shiftDateKey,
  toDateKey,
  TZ,
  weekStartKey,
} from "@/lib/tz";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import type { ReservationWithSegments } from "@/db/schema";

type View = "day" | "week" | "month";

type SearchParams = Promise<{
  view?: string;
  d?: string;
  y?: string;
  m?: string;
}>;

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

function isValidDateKey(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const view: View =
    sp.view === "day" || sp.view === "week" ? sp.view : "month";
  const now = toZonedTime(new Date(), TZ);
  const todayKey = toDateKey(new Date());

  // Reference date
  let refDateKey: string;
  if (isValidDateKey(sp.d)) {
    refDateKey = sp.d;
  } else if (sp.y && sp.m) {
    refDateKey = `${sp.y}-${String(sp.m).padStart(2, "0")}-01`;
  } else {
    refDateKey = todayKey;
  }

  return (
    <div className="space-y-4">
      <ViewSwitcher view={view} dateKey={refDateKey} />

      {view === "day" ? (
        <DayView dateKey={refDateKey} todayKey={todayKey} />
      ) : view === "week" ? (
        <WeekView dateKey={refDateKey} todayKey={todayKey} />
      ) : (
        <MonthView refDateKey={refDateKey} now={now} todayKey={todayKey} />
      )}
    </div>
  );
}

function ViewSwitcher({ view, dateKey }: { view: View; dateKey: string }) {
  const options: { v: View; label: string }[] = [
    { v: "day", label: "일" },
    { v: "week", label: "주" },
    { v: "month", label: "월" },
  ];
  return (
    <div className="flex items-center justify-center gap-1">
      {options.map(({ v, label }) => (
        <Link key={v} href={`/?view=${v}&d=${dateKey}`}>
          <Button
            size="sm"
            variant={view === v ? "default" : "outline"}
            className="h-8 w-14"
          >
            {label}
          </Button>
        </Link>
      ))}
    </div>
  );
}

async function DayView({
  dateKey,
  todayKey,
}: {
  dateKey: string;
  todayKey: string;
}) {
  const { start, end } = dayRange(dateKey);
  const reservations = await listReservations({ from: start, to: end });
  const activeReservations = reservations.filter(
    (r) => r.status !== "cancelled",
  );
  const totalAmount = activeReservations.reduce(
    (s, r) => s + r.totalAmount,
    0,
  );

  const prevKey = shiftDateKey(dateKey, -1);
  const nextKey = shiftDateKey(dateKey, 1);

  // Time range: 06:00 ~ 24:00 by default, extend if needed
  let startHour = 6;
  let endHour = 24;
  for (const r of reservations) {
    const h = Number(formatInTimeZone(r.startAt, TZ, "H"));
    const endH =
      Math.ceil(r.endAt.getTime() / 3600000) -
      Math.floor(start.getTime() / 3600000);
    if (h < startHour) startHour = Math.max(0, h);
    if (endH > endHour) endHour = Math.min(24, endH);
  }
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => i + startHour,
  );
  const HOUR_HEIGHT = 56;
  const totalHeight = hours.length * HOUR_HEIGHT;

  const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"][
    Number(formatInTimeZone(start, TZ, "e")) % 7
  ];
  const isToday = dateKey === todayKey;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
          <CardTitle className="text-lg sm:text-xl">
            {formatInTimeZone(start, TZ, "yyyy년 M월 d일")}{" "}
            <span className={isToday ? "text-primary" : "text-muted-foreground"}>
              ({weekdayKo})
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Link href={`/?view=day&d=${prevKey}`}>
              <Button size="icon" variant="outline" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/?view=day&d=${todayKey}`}>
              <Button size="sm" variant="outline" className="h-8">
                오늘
              </Button>
            </Link>
            <Link href={`/?view=day&d=${nextKey}`}>
              <Button size="icon" variant="outline" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex items-baseline gap-3 sm:block sm:text-right">
          <div className="text-xs text-muted-foreground">
            {activeReservations.length}건
            {reservations.length !== activeReservations.length
              ? ` · 취소 ${reservations.length - activeReservations.length}`
              : ""}
          </div>
          <div className="text-lg sm:text-xl font-semibold font-mono">
            {formatKRW(totalAmount)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            이 날에는 예약이 없습니다
            <div className="mt-3">
              <Link href={`/reservations/new?date=${dateKey}`}>
                <Button size="sm">이 날 예약 만들기</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative flex" style={{ height: totalHeight }}>
            {/* Hour labels */}
            <div className="w-14 shrink-0">
              {hours.map((h) => (
                <div
                  key={h}
                  className="relative text-[10px] text-muted-foreground text-right pr-2"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="absolute -top-1.5 right-2 bg-card px-1">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>
            {/* Grid + events */}
            <div className="relative flex-1 border-l">
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="border-b border-dashed border-border/60"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}
              {reservations.map((r) => {
                const startMin = Math.max(
                  0,
                  (r.startAt.getTime() - start.getTime()) / 60000 -
                    startHour * 60,
                );
                const endMin =
                  (r.endAt.getTime() - start.getTime()) / 60000 -
                  startHour * 60;
                const clampedEnd = Math.min(hours.length * 60, endMin);
                const top = (startMin * HOUR_HEIGHT) / 60;
                const height = Math.max(
                  24,
                  ((clampedEnd - startMin) * HOUR_HEIGHT) / 60,
                );
                const cancelled = r.status === "cancelled";
                return (
                  <Link
                    key={r.id}
                    href={`/reservations/${r.id}`}
                    className={`absolute left-1 right-2 rounded-md px-2 py-1 text-xs border transition-colors ${
                      cancelled
                        ? "bg-muted/60 border-border text-muted-foreground line-through"
                        : "bg-primary/10 border-primary/30 hover:bg-primary/20 text-foreground"
                    }`}
                    style={{ top, height }}
                  >
                    <div className="font-medium truncate">
                      {r.customerName}{" "}
                      <span className="text-[10px] text-muted-foreground">
                        {peopleLabel(r.peopleSegments)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                      {fmtTimeRange(r.startAt, r.endAt)} ·{" "}
                      {formatKRW(r.totalAmount)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function WeekView({
  dateKey,
  todayKey,
}: {
  dateKey: string;
  todayKey: string;
}) {
  const weekStart = weekStartKey(dateKey);
  const dayKeys = Array.from({ length: 7 }, (_, i) =>
    shiftDateKey(weekStart, i),
  );
  const { start: rangeStart } = dayRange(weekStart);
  const { end: rangeEnd } = dayRange(shiftDateKey(weekStart, 6));

  const reservations = await listReservations({
    from: rangeStart,
    to: rangeEnd,
  });
  const byDay = groupByDay(reservations);
  const activeReservations = reservations.filter(
    (r) => r.status !== "cancelled",
  );
  const totalAmount = activeReservations.reduce(
    (s, r) => s + r.totalAmount,
    0,
  );

  const prevKey = shiftDateKey(weekStart, -7);
  const nextKey = shiftDateKey(weekStart, 7);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
          <CardTitle className="text-lg sm:text-xl">
            {formatInTimeZone(dayRange(weekStart).start, TZ, "yyyy-MM-dd")} ~{" "}
            {formatInTimeZone(dayRange(dayKeys[6]).start, TZ, "MM-dd")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Link href={`/?view=week&d=${prevKey}`}>
              <Button size="icon" variant="outline" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/?view=week&d=${todayKey}`}>
              <Button size="sm" variant="outline" className="h-8">
                이번 주
              </Button>
            </Link>
            <Link href={`/?view=week&d=${nextKey}`}>
              <Button size="icon" variant="outline" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex items-baseline gap-3 sm:block sm:text-right">
          <div className="text-xs text-muted-foreground">
            {activeReservations.length}건
            {reservations.length !== activeReservations.length
              ? ` · 취소 ${reservations.length - activeReservations.length}`
              : ""}
          </div>
          <div className="text-lg sm:text-xl font-semibold font-mono">
            {formatKRW(totalAmount)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
          {dayKeys.map((dk, i) => {
            const items = byDay.get(dk) ?? [];
            const isToday = dk === todayKey;
            const isWeekend = i === 0 || i === 6;
            return (
              <div
                key={dk}
                className="bg-card min-h-[180px] sm:min-h-[220px] p-2 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`text-[10px] sm:text-xs font-medium ${
                      i === 0
                        ? "text-rose-500"
                        : i === 6
                          ? "text-sky-500"
                          : "text-muted-foreground"
                    }`}
                  >
                    {weekdays[i]}
                  </div>
                  <Link
                    href={`/reservations/new?date=${dk}`}
                    className={`text-xs font-medium ${
                      isToday
                        ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                        : isWeekend
                          ? i === 0
                            ? "text-rose-500"
                            : "text-sky-500"
                          : ""
                    }`}
                  >
                    {Number(formatInTimeZone(dayRange(dk).start, TZ, "d"))}
                  </Link>
                </div>
                <div className="space-y-1">
                  {items.map((r) => (
                    <Link
                      key={r.id}
                      href={`/reservations/${r.id}`}
                      className={`block text-[10px] sm:text-[11px] rounded px-1.5 py-1 transition-colors ${
                        r.status === "cancelled"
                          ? "bg-muted text-muted-foreground line-through"
                          : "bg-primary/10 hover:bg-primary/20 text-primary"
                      }`}
                    >
                      <div className="font-mono text-[9px] sm:text-[10px]">
                        {fmtHourRangeCompact(r.startAt, r.endAt)}
                      </div>
                      <div className="truncate font-medium">
                        {r.customerName}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

async function MonthView({
  refDateKey,
  now,
  todayKey,
}: {
  refDateKey: string;
  now: Date;
  todayKey: string;
}) {
  const [yStr, mStr] = refDateKey.split("-");
  const year = Number(yStr);
  const month = Number(mStr);

  const reservations = await listReservationsInMonth(year, month);
  const byDay = groupByDay(reservations);
  const grid = buildMonthGrid(year, month);
  const activeReservations = reservations.filter(
    (r) => r.status !== "cancelled",
  );
  const totalAmount = activeReservations.reduce(
    (s, r) => s + r.totalAmount,
    0,
  );

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const prevKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const nextKey = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
            <CardTitle className="text-lg sm:text-xl">
              {year}년 {month}월
            </CardTitle>
            <div className="flex items-center gap-1">
              <Link href={`/?view=month&d=${prevKey}`}>
                <Button size="icon" variant="outline" className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/?view=month&d=${todayKey}`}>
                <Button size="sm" variant="outline" className="h-8">
                  오늘
                </Button>
              </Link>
              <Link href={`/?view=month&d=${nextKey}`}>
                <Button size="icon" variant="outline" className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-baseline gap-3 sm:block sm:text-right">
            <div className="text-xs text-muted-foreground">
              {activeReservations.length}건
              {reservations.length !== activeReservations.length
                ? ` · 취소 ${reservations.length - activeReservations.length}`
                : ""}
            </div>
            <div className="text-lg sm:text-xl font-semibold font-mono">
              {formatKRW(totalAmount)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
            {weekdays.map((d, i) => (
              <div
                key={d}
                className={`bg-card text-[10px] sm:text-xs font-medium text-center py-1.5 sm:py-2 ${
                  i === 0
                    ? "text-rose-500"
                    : i === 6
                      ? "text-sky-500"
                      : "text-muted-foreground"
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
              const isToday = dayKey === todayKey;
              return (
                <div
                  key={dayKey}
                  className={`bg-card min-h-[68px] sm:min-h-[110px] p-1 sm:p-2 relative ${
                    !isCurrentMonth ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    <Link
                      href={`/?view=day&d=${dayKey}`}
                      className={`text-[10px] sm:text-xs font-medium ${
                        isToday
                          ? "bg-primary text-primary-foreground rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"
                          : dow === 0
                            ? "text-rose-500"
                            : dow === 6
                              ? "text-sky-500"
                              : ""
                      }`}
                    >
                      {day.getUTCDate()}
                    </Link>
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    {items.slice(0, 2).map((r) => (
                      <Link
                        key={r.id}
                        href={`/reservations/${r.id}`}
                        className={`block text-[9px] sm:text-[11px] rounded px-1 py-0.5 truncate transition-colors ${
                          r.status === "cancelled"
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-primary/10 hover:bg-primary/20 text-primary"
                        }`}
                      >
                        <span className="hidden sm:inline font-mono">
                          {fmtHourRangeCompact(r.startAt, r.endAt)}{" "}
                        </span>
                        {r.customerName}
                      </Link>
                    ))}
                    {items.length > 2 ? (
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground px-1">
                        +{items.length - 2}
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
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="divide-y">
              {reservations.map((r) => (
                <Link
                  key={r.id}
                  href={`/reservations/${r.id}`}
                  className={`flex items-center justify-between gap-3 px-4 sm:px-2 py-3 hover:bg-muted/50 transition-colors ${
                    r.status === "cancelled" ? "opacity-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div
                      className={`flex items-center gap-2 flex-wrap ${
                        r.status === "cancelled" ? "line-through" : ""
                      }`}
                    >
                      <span className="font-medium truncate">
                        {r.customerName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {peopleLabel(r.peopleSegments)}
                      </span>
                      {r.tags.slice(0, 2).map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {formatInTimeZone(r.startAt, TZ, "MM-dd")} ·{" "}
                      {fmtTimeRange(r.startAt, r.endAt)}
                    </div>
                  </div>
                  <div
                    className={`font-mono text-sm shrink-0 ${
                      r.status === "cancelled" ? "line-through" : "font-semibold"
                    }`}
                  >
                    {formatKRW(r.totalAmount)}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            이번 달 예약이 아직 없습니다
            <div className="mt-3">
              <Link href="/reservations/new">
                <Button size="sm">새 예약 만들기</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
