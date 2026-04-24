import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { listPlatforms } from "@/lib/platforms";
import {
  countReservations,
  listReservations,
} from "@/lib/reservations";
import { getPlatformRevenue, getRevenueSummary } from "@/lib/revenue";
import {
  fmtDateTime,
  formatKRW,
  monthRange,
  TZ,
} from "@/lib/tz";
import { toZonedTime } from "date-fns-tz";

type SearchParams = Promise<{
  y?: string;
  m?: string;
  platform?: string;
  p?: string;
}>;

const PAGE_SIZE = 15;

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { y, m, platform, p } = sp;
  const now = toZonedTime(new Date(), TZ);
  const year = Number(y) || now.getFullYear();
  const month = Number(m) || now.getMonth() + 1;
  const platformId =
    platform && platform !== "all" ? Number(platform) : undefined;
  const page = Math.max(1, Number(p) || 1);

  const { start, end } = monthRange(year, month);

  const [summary, byPlatform, platforms, rows, totalCount] = await Promise.all([
    getRevenueSummary(start, end),
    getPlatformRevenue(start, end),
    listPlatforms(),
    listReservations({
      from: start,
      to: end,
      platformId,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countReservations({ from: start, to: end, platformId }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  function monthHref(yr: number, mo: number, resetPlatform = false): string {
    const p = new URLSearchParams();
    p.set("y", String(yr));
    p.set("m", String(mo));
    if (!resetPlatform && platform && platform !== "all") {
      p.set("platform", platform);
    }
    return `/revenue?${p.toString()}`;
  }

  function platformHref(nextPlatform: string): string {
    const p = new URLSearchParams();
    if (y) p.set("y", y);
    if (m) p.set("m", m);
    if (nextPlatform && nextPlatform !== "all") p.set("platform", nextPlatform);
    const qs = p.toString();
    return qs ? `/revenue?${qs}` : "/revenue";
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>매출</CardTitle>
            <CardDescription>
              {year}년 {month}월 · 총 {summary.count}건 (활성 {summary.activeCount}
              {summary.cancelledCount > 0
                ? ` · 취소 ${summary.cancelledCount}`
                : ""}
              )
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Link href={monthHref(prevYear, prevMonth)}>
              <Button size="sm" variant="outline">
                ‹
              </Button>
            </Link>
            <Link href="/revenue">
              <Button size="sm" variant="outline">
                이번 달
              </Button>
            </Link>
            <Link href={monthHref(nextYear, nextMonth)}>
              <Button size="sm" variant="outline">
                ›
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Metric
              label="총 매출"
              sub="부가세 포함 · 취소 반영"
              amount={summary.totalAmount}
              variant="primary"
            />
            <Metric
              label="공급가액"
              sub="부가세 제외"
              amount={summary.subtotalAmount}
            />
            <Metric
              label="부가세"
              sub="세금계산서 발행분"
              amount={summary.vatAmount}
            />
            <Metric
              label="플랫폼 수수료"
              sub="매출 대비 차감"
              amount={summary.commissionAmount}
              negative
            />
            <Metric
              label="실수령"
              sub="공급가액 − 수수료"
              amount={summary.netAmount}
              variant="success"
            />
          </div>
          {summary.refundAmount > 0 ? (
            <p className="text-xs text-muted-foreground mt-3">
              이번 달 환불 합계 {formatKRW(summary.refundAmount)} · 취소된 예약은
              (100% − 환불율) 비율만 매출에 반영됩니다.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">플랫폼별</CardTitle>
        </CardHeader>
        <CardContent>
          {byPlatform.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              이 달에 예약 내역이 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>플랫폼</TableHead>
                  <TableHead className="text-right">건수</TableHead>
                  <TableHead className="text-right">총 매출</TableHead>
                  <TableHead className="text-right">공급가액</TableHead>
                  <TableHead className="text-right">부가세</TableHead>
                  <TableHead className="text-right">수수료</TableHead>
                  <TableHead className="text-right">실수령</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPlatform.map((row) => (
                  <TableRow
                    key={row.platformId ?? "direct"}
                    className="font-mono text-xs"
                  >
                    <TableCell className="font-sans">
                      {row.platformId === null ? (
                        <Badge variant="outline" className="text-[10px]">
                          직접
                        </Badge>
                      ) : (
                        row.platformName
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.activeCount + row.cancelledCount}
                      {row.cancelledCount > 0 ? (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          (취소 {row.cancelledCount})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatKRW(row.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatKRW(row.subtotalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatKRW(row.vatAmount)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {row.commissionAmount > 0
                        ? `-${formatKRW(row.commissionAmount)}`
                        : formatKRW(0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatKRW(row.netAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base">예약 내역</CardTitle>
            <CardDescription>
              {totalCount}건 · 페이지 {page} / {totalPages}
            </CardDescription>
          </div>
          <form method="get" className="space-y-1">
            <Label htmlFor="platform" className="text-xs">
              플랫폼 필터
            </Label>
            <div className="flex items-end gap-2">
              <input type="hidden" name="y" value={String(year)} />
              <input type="hidden" name="m" value={String(month)} />
              <select
                id="platform"
                name="platform"
                defaultValue={platform ?? "all"}
                className="h-9 min-w-40 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
              >
                <option value="all">전체</option>
                <option value="">직접 / 없음</option>
                {platforms.map((pl) => (
                  <option key={pl.id} value={String(pl.id)}>
                    {pl.name}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                적용
              </Button>
              <Link href={platformHref("all")}>
                <Button type="button" size="sm" variant="ghost">
                  초기화
                </Button>
              </Link>
            </div>
          </form>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              조건에 맞는 예약이 없습니다.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>상태</TableHead>
                    <TableHead>일시</TableHead>
                    <TableHead>예약자</TableHead>
                    <TableHead>플랫폼</TableHead>
                    <TableHead className="text-right">총 매출</TableHead>
                    <TableHead className="text-right">수수료</TableHead>
                    <TableHead className="text-right">환불</TableHead>
                    <TableHead className="text-right">반영</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const kept =
                      r.status === "cancelled"
                        ? Math.round(
                            r.totalAmount * ((100 - r.refundRatePct) / 100),
                          )
                        : r.totalAmount;
                    const cancelled = r.status === "cancelled";
                    return (
                      <TableRow
                        key={r.id}
                        className={cancelled ? "opacity-70" : ""}
                      >
                        <TableCell>
                          {cancelled ? (
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                            >
                              취소
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              예약
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <Link
                            href={`/reservations/${r.id}`}
                            className="hover:underline"
                          >
                            {fmtDateTime(r.startAt)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/reservations/${r.id}`}
                            className="hover:underline"
                          >
                            {r.customerName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {r.platform ? (
                            <Badge variant="outline" className="text-[10px]">
                              {r.platform.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              직접
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatKRW(r.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-destructive">
                          {r.commissionAmount > 0
                            ? `-${formatKRW(r.commissionAmount)}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-destructive">
                          {r.refundAmount > 0
                            ? `-${formatKRW(r.refundAmount)} (${r.refundRatePct}%)`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {formatKRW(kept)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 ? (
                <div className="mt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    pathname="/revenue"
                    searchParams={sp}
                  />
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label,
  sub,
  amount,
  variant,
  negative,
}: {
  label: string;
  sub?: string;
  amount: number;
  variant?: "primary" | "success";
  negative?: boolean;
}) {
  const color =
    variant === "primary"
      ? "text-foreground"
      : variant === "success"
        ? "text-emerald-600"
        : negative
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="p-3 rounded-md border bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold font-mono ${color}`}>
        {negative && amount > 0 ? "-" : ""}
        {formatKRW(amount)}
      </div>
      {sub ? <div className="text-[10px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
