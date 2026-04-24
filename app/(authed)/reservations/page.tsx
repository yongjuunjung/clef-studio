import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fromZonedTime } from "date-fns-tz";
import { InlineStatusButton } from "@/components/inline-status-button";
import { Pagination } from "@/components/pagination";
import {
  cancelReservation,
  getAllTags,
  listReservations,
  restoreReservation,
  summarizeReservations,
} from "@/lib/reservations";
import { peopleLabel } from "@/lib/reservations-helpers";
import {
  durationHours,
  fmtDateTime,
  formatDurationHours,
  formatKRW,
  TZ,
} from "@/lib/tz";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  tag?: string;
  status?: string;
  p?: string;
}>;

const PAGE_SIZE = 15;

function parseLocalDate(dateStr: string | undefined, endOfDay = false) {
  if (!dateStr) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return undefined;
  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00";
  return fromZonedTime(`${dateStr}${suffix}`, TZ);
}

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "active", label: "예약" },
  { value: "cancelled", label: "취소" },
] as const;

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { from, to, tag, status, p } = sp;
  const fromDate = parseLocalDate(from);
  const toDate = parseLocalDate(to, true);
  const statusFilter =
    status === "active" || status === "cancelled" ? status : undefined;
  const page = Math.max(1, Number(p) || 1);

  const filterOpts: {
    from?: Date;
    to?: Date;
    tag?: string;
    status?: "active" | "cancelled";
  } = {
    from: fromDate,
    to: toDate,
    tag: tag || undefined,
    status: statusFilter,
  };

  const [rows, summary, allTags] = await Promise.all([
    listReservations({
      ...filterOpts,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    summarizeReservations(filterOpts),
    getAllTags(),
  ]);
  const rowsTotalCount = summary.totalCount;
  const totalPages = Math.max(1, Math.ceil(rowsTotalCount / PAGE_SIZE));
  const total = summary.activeTotalAmount;
  const activeCount = summary.activeCount;
  const cancelledCount = summary.cancelledCount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>예약 목록</CardTitle>
          <Link href="/reservations/new">
            <Button size="sm">새 예약</Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 상태 탭 */}
          <div className="flex items-center gap-1">
            {STATUS_OPTIONS.map((opt) => {
              const params = new URLSearchParams();
              if (from) params.set("from", from);
              if (to) params.set("to", to);
              if (tag) params.set("tag", tag);
              if (opt.value) params.set("status", opt.value);
              const active = (status ?? "") === opt.value;
              return (
                <Link
                  key={opt.value || "all"}
                  href={`/reservations${params.toString() ? `?${params.toString()}` : ""}`}
                >
                  <Button
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                  >
                    {opt.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <form method="get" className="grid md:grid-cols-4 gap-3 items-end">
            {statusFilter ? (
              <input type="hidden" name="status" value={statusFilter} />
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="from">시작 날짜</Label>
              <Input id="from" name="from" type="date" defaultValue={from ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">종료 날짜</Label>
              <Input id="to" name="to" type="date" defaultValue={to ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tag">태그</Label>
              <select
                id="tag"
                name="tag"
                defaultValue={tag ?? ""}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
              >
                <option value="">전체</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                검색
              </Button>
              <Link href="/reservations" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  초기화
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {rowsTotalCount}건
            {cancelledCount > 0 ? (
              <span className="text-xs text-muted-foreground ml-1">
                (예약 {activeCount} · 취소 {cancelledCount})
              </span>
            ) : null}
          </CardTitle>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              총 금액 (취소 제외)
            </div>
            <div className="text-xl font-semibold">{formatKRW(total)}</div>
          </div>
        </CardHeader>
        <CardContent>
          {rowsTotalCount === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              조건에 맞는 예약이 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상태</TableHead>
                  <TableHead>일시</TableHead>
                  <TableHead>예약자</TableHead>
                  <TableHead>시간</TableHead>
                  <TableHead>인원</TableHead>
                  <TableHead>태그</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const cancelAction = cancelReservation.bind(null, r.id);
                  const restoreAction = restoreReservation.bind(null, r.id);
                  const cancelled = r.status === "cancelled";
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        {cancelled ? (
                          <Badge
                            variant="destructive"
                            className="text-[10px]"
                          >
                            취소
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            예약
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className={`font-mono text-xs ${cancelled ? "opacity-50 line-through" : ""}`}
                      >
                        <Link href={`/reservations/${r.id}`}>
                          {fmtDateTime(r.startAt)}
                        </Link>
                      </TableCell>
                      <TableCell
                        className={cancelled ? "opacity-50 line-through" : ""}
                      >
                        <Link href={`/reservations/${r.id}`}>
                          {r.customerName}
                        </Link>
                      </TableCell>
                      <TableCell
                        className={cancelled ? "opacity-50 line-through" : ""}
                      >
                        {formatDurationHours(durationHours(r.startAt, r.endAt))}
                      </TableCell>
                      <TableCell
                        className={cancelled ? "opacity-50 line-through" : ""}
                      >
                        {peopleLabel(r.peopleSegments)}
                      </TableCell>
                      <TableCell
                        className={cancelled ? "opacity-50 line-through" : ""}
                      >
                        <div className="flex flex-wrap gap-1">
                          {r.tags.map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="text-xs"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${cancelled ? "opacity-50 line-through" : ""}`}
                      >
                        {formatKRW(r.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {cancelled ? (
                          <InlineStatusButton
                            action={restoreAction}
                            variant="restore"
                          />
                        ) : (
                          <InlineStatusButton
                            action={cancelAction}
                            variant="cancel"
                            reservationStartAt={r.startAt}
                            totalAmount={r.totalAmount}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 ? (
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                pathname="/reservations"
                searchParams={sp}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
