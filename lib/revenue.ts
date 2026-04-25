import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { platforms, reservationExtensions, reservations } from "@/db/schema";

export type RevenueSummary = {
  count: number;
  activeCount: number;
  cancelledCount: number;
  totalAmount: number;
  subtotalAmount: number;
  vatAmount: number;
  commissionAmount: number;
  refundAmount: number;
  netAmount: number;
  extensionAmount: number;
  extensionCount: number;
};

export type PlatformRevenueRow = RevenueSummary & {
  platformId: number | null;
  platformName: string;
};

function toInt(n: unknown): number {
  const v = Number(n ?? 0);
  return Math.round(v);
}

/**
 * 취소 건은 (100 - refund_rate_pct) / 100 만큼만 매출에 반영된다.
 * active 건은 refund_rate_pct = 0 이라 그대로 100% 반영.
 */
const KEPT_RATIO = sql`((100.0 - ${reservations.refundRatePct}) / 100.0)`;

async function getExtensionRevenueTotal(
  from: Date,
  to: Date,
): Promise<{ amount: number; count: number }> {
  const [row] = await db
    .select({
      amount:
        sql<number>`coalesce(sum(${reservationExtensions.amount} * ${KEPT_RATIO}), 0)`.mapWith(
          Number,
        ),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(reservationExtensions)
    .innerJoin(
      reservations,
      eq(reservationExtensions.reservationId, reservations.id),
    )
    .where(and(gte(reservations.startAt, from), lt(reservations.startAt, to)));
  return { amount: toInt(row?.amount), count: toInt(row?.count) };
}

async function getExtensionRevenueByPlatform(
  from: Date,
  to: Date,
): Promise<Map<number | null, { amount: number; count: number }>> {
  const rows = await db
    .select({
      platformId: reservations.platformId,
      amount:
        sql<number>`coalesce(sum(${reservationExtensions.amount} * ${KEPT_RATIO}), 0)`.mapWith(
          Number,
        ),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(reservationExtensions)
    .innerJoin(
      reservations,
      eq(reservationExtensions.reservationId, reservations.id),
    )
    .where(and(gte(reservations.startAt, from), lt(reservations.startAt, to)))
    .groupBy(reservations.platformId);
  const map = new Map<number | null, { amount: number; count: number }>();
  for (const r of rows) {
    map.set(r.platformId, {
      amount: toInt(r.amount),
      count: toInt(r.count),
    });
  }
  return map;
}

export async function getRevenueSummary(
  from: Date,
  to: Date,
): Promise<RevenueSummary> {
  const [raw] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
      activeCount:
        sql<number>`sum(case when ${reservations.status} = 'active' then 1 else 0 end)`.mapWith(
          Number,
        ),
      cancelledCount:
        sql<number>`sum(case when ${reservations.status} = 'cancelled' then 1 else 0 end)`.mapWith(
          Number,
        ),
      totalAmount:
        sql<number>`coalesce(sum(${reservations.totalAmount} * ${KEPT_RATIO}), 0)`.mapWith(
          Number,
        ),
      subtotalAmount:
        sql<number>`coalesce(sum(${reservations.subtotalAmount} * ${KEPT_RATIO}), 0)`.mapWith(
          Number,
        ),
      vatAmount:
        sql<number>`coalesce(sum(${reservations.vatAmount} * ${KEPT_RATIO}), 0)`.mapWith(
          Number,
        ),
      commissionAmount:
        sql<number>`coalesce(sum(${reservations.commissionAmount} * ${KEPT_RATIO}), 0)`.mapWith(
          Number,
        ),
      refundAmount:
        sql<number>`coalesce(sum(${reservations.refundAmount}), 0)`.mapWith(
          Number,
        ),
    })
    .from(reservations)
    .where(and(gte(reservations.startAt, from), lt(reservations.startAt, to)));

  const subtotalAmount = toInt(raw.subtotalAmount);
  const commissionAmount = toInt(raw.commissionAmount);
  const ext = await getExtensionRevenueTotal(from, to);
  return {
    count: toInt(raw.count),
    activeCount: toInt(raw.activeCount),
    cancelledCount: toInt(raw.cancelledCount),
    totalAmount: toInt(raw.totalAmount),
    subtotalAmount,
    vatAmount: toInt(raw.vatAmount),
    commissionAmount,
    refundAmount: toInt(raw.refundAmount),
    netAmount: subtotalAmount - commissionAmount,
    extensionAmount: ext.amount,
    extensionCount: ext.count,
  };
}

export async function getPlatformRevenue(
  from: Date,
  to: Date,
): Promise<PlatformRevenueRow[]> {
  const rows = await db
    .select({
      platformId: reservations.platformId,
      platformName:
        sql<string>`coalesce(${platforms.name}, '직접')`.mapWith(String),
      count: sql<number>`count(*)`.mapWith(Number),
      activeCount:
        sql<number>`sum(case when ${reservations.status} = 'active' then 1 else 0 end)`.mapWith(
          Number,
        ),
      cancelledCount:
        sql<number>`sum(case when ${reservations.status} = 'cancelled' then 1 else 0 end)`.mapWith(
          Number,
        ),
      totalAmount:
        sql<number>`coalesce(sum(${reservations.totalAmount} * ${KEPT_RATIO}), 0)`.mapWith(
          Number,
        ),
      subtotalAmount:
        sql<number>`coalesce(sum(${reservations.subtotalAmount} * ${KEPT_RATIO}), 0)`.mapWith(
          Number,
        ),
      vatAmount:
        sql<number>`coalesce(sum(${reservations.vatAmount} * ${KEPT_RATIO}), 0)`.mapWith(
          Number,
        ),
      commissionAmount:
        sql<number>`coalesce(sum(${reservations.commissionAmount} * ${KEPT_RATIO}), 0)`.mapWith(
          Number,
        ),
      refundAmount:
        sql<number>`coalesce(sum(${reservations.refundAmount}), 0)`.mapWith(
          Number,
        ),
    })
    .from(reservations)
    .leftJoin(platforms, eq(reservations.platformId, platforms.id))
    .where(and(gte(reservations.startAt, from), lt(reservations.startAt, to)))
    .groupBy(reservations.platformId, platforms.name)
    .orderBy(sql`coalesce(${platforms.name}, 'zzz_직접')`);

  const extByPlatform = await getExtensionRevenueByPlatform(from, to);
  return rows.map((r) => {
    const subtotalAmount = toInt(r.subtotalAmount);
    const commissionAmount = toInt(r.commissionAmount);
    const ext = extByPlatform.get(r.platformId) ?? { amount: 0, count: 0 };
    return {
      platformId: r.platformId,
      platformName: r.platformName,
      count: toInt(r.count),
      activeCount: toInt(r.activeCount),
      cancelledCount: toInt(r.cancelledCount),
      totalAmount: toInt(r.totalAmount),
      subtotalAmount,
      vatAmount: toInt(r.vatAmount),
      commissionAmount,
      refundAmount: toInt(r.refundAmount),
      netAmount: subtotalAmount - commissionAmount,
      extensionAmount: ext.amount,
      extensionCount: ext.count,
    };
  });
}
