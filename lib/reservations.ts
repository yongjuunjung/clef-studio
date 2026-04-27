"use server";

import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  platforms,
  reservationExtensions,
  reservationPeopleSegments,
  reservations,
} from "@/db/schema";
import type { ReservationWithSegments } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { computeReservationAmounts } from "@/lib/reservations-helpers";
import { computeRefund } from "@/lib/refund-policy";
import { getSettings } from "@/lib/settings";
import {
  parseLocalDateTime,
  monthRange,
  splitDayNightHoursFromDates,
} from "@/lib/tz";
import {
  deleteCalendarEvent,
  pushCalendarEvent,
  updateCalendarEvent,
} from "@/lib/google-calendar";

const segmentInputSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  peopleCount: z.coerce.number().int().min(1).max(1000),
});

const reservationSchema = z.object({
  customerName: z.string().trim().min(1, "이름을 입력하세요").max(100),
  customerPhone: z.string().trim().max(30).optional().or(z.literal("")),
  customerEmail: z
    .string()
    .trim()
    .email("이메일 형식이 아닙니다")
    .max(200)
    .optional()
    .or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식 오류"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "시작 시간 형식 오류"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "종료 시간 형식 오류"),
  dayHourlyRate: z.coerce.number().int().min(0, "0 이상"),
  nightHourlyRate: z.coerce.number().int().min(0, "0 이상"),
  platformId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v !== "" && v !== "none" ? Number(v) : null))
    .refine((v) => v === null || (Number.isFinite(v) && v > 0), {
      message: "플랫폼 선택이 올바르지 않습니다",
    }),
  taxInvoice: z
    .union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal(""), z.null(), z.undefined()])
    .transform((v) => v === "on" || v === "true" || v === "1"),
  segmentsJson: z.string().min(1, "시간별 인원을 입력하세요"),
  tags: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

function parseTags(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (60 * 60 * 1000);
}

type ParsedForm = {
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  startAt: Date;
  endAt: Date;
  dayHourlyRate: number;
  nightHourlyRate: number;
  platformId: number | null;
  platformCommissionPct: number;
  commissionAmount: number;
  taxInvoice: boolean;
  subtotalAmount: number;
  vatAmount: number;
  totalAmount: number;
  tags: string[];
  notes: string | null;
  segments: { startAt: Date; endAt: Date; peopleCount: number }[];
};

async function extractForm(formData: FormData): Promise<ParsedForm> {
  const optStr = (key: string) => {
    const v = formData.get(key);
    return v === null ? undefined : v;
  };
  const parsed = reservationSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: optStr("customerPhone"),
    customerEmail: optStr("customerEmail"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    dayHourlyRate: formData.get("dayHourlyRate"),
    nightHourlyRate: formData.get("nightHourlyRate"),
    platformId: formData.get("platformId"),
    taxInvoice: formData.get("taxInvoice"),
    segmentsJson: formData.get("segmentsJson"),
    tags: optStr("tags"),
    notes: optStr("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const d = parsed.data;
  const s = await getSettings();

  const startAt = parseLocalDateTime(d.date, d.startTime);
  const endAt = parseLocalDateTime(d.date, d.endTime);
  if (endAt.getTime() <= startAt.getTime()) {
    throw new Error("종료 시간은 시작 시간보다 이후여야 합니다");
  }
  const totalHours = hoursBetween(startAt, endAt);
  if (totalHours < s.minBookingHours) {
    throw new Error(`최소 예약 시간은 ${s.minBookingHours}시간입니다`);
  }
  if (totalHours > 24) {
    throw new Error("최대 24시간까지만 예약 가능합니다");
  }

  let rawSegments: z.infer<typeof segmentInputSchema>[];
  try {
    rawSegments = z.array(segmentInputSchema).parse(JSON.parse(d.segmentsJson));
  } catch {
    throw new Error("인원 구간 형식이 올바르지 않습니다");
  }
  if (rawSegments.length === 0) {
    throw new Error("시간별 인원을 최소 1개 입력하세요");
  }

  const segments = rawSegments
    .map((r) => ({
      startAt: parseLocalDateTime(d.date, r.startTime),
      endAt: parseLocalDateTime(d.date, r.endTime),
      peopleCount: r.peopleCount,
    }))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  if (segments[0].startAt.getTime() !== startAt.getTime()) {
    throw new Error("첫 인원 구간이 예약 시작 시간부터 시작해야 합니다");
  }
  if (segments[segments.length - 1].endAt.getTime() !== endAt.getTime()) {
    throw new Error("마지막 인원 구간이 예약 종료 시간까지 이어져야 합니다");
  }
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].endAt.getTime() <= segments[i].startAt.getTime()) {
      throw new Error("인원 구간의 시작/종료가 올바르지 않습니다");
    }
    if (i > 0 && segments[i].startAt.getTime() !== segments[i - 1].endAt.getTime()) {
      throw new Error("인원 구간이 연속되지 않습니다 (빈 시간 또는 겹침)");
    }
  }

  let commissionPct = 0;
  if (d.platformId !== null) {
    const [p] = await db
      .select()
      .from(platforms)
      .where(eq(platforms.id, d.platformId));
    if (!p) throw new Error("선택한 플랫폼을 찾을 수 없습니다");
    commissionPct = p.commissionRatePct;
  }

  const amounts = computeReservationAmounts({
    startAt,
    endAt,
    dayHourlyRate: d.dayHourlyRate,
    nightHourlyRate: d.nightHourlyRate,
    segments,
    minPeople: s.defaultMinPeople,
    extraPerPersonHourlyRate: s.extraPerPersonHourlyRate,
    taxInvoice: d.taxInvoice,
    commissionPct,
  });

  return {
    customerName: d.customerName,
    customerPhone: d.customerPhone || null,
    customerEmail: d.customerEmail || null,
    startAt,
    endAt,
    dayHourlyRate: d.dayHourlyRate,
    nightHourlyRate: d.nightHourlyRate,
    platformId: d.platformId,
    platformCommissionPct: commissionPct,
    commissionAmount: amounts.commissionAmount,
    taxInvoice: d.taxInvoice,
    subtotalAmount: amounts.subtotalAmount,
    vatAmount: amounts.vatAmount,
    totalAmount: amounts.totalAmount,
    tags: parseTags(d.tags ?? ""),
    notes: d.notes || null,
    segments,
  };
}

async function replaceSegments(
  reservationId: number,
  segments: { startAt: Date; endAt: Date; peopleCount: number }[],
) {
  await db
    .delete(reservationPeopleSegments)
    .where(eq(reservationPeopleSegments.reservationId, reservationId));
  await db.insert(reservationPeopleSegments).values(
    segments.map((s) => ({
      reservationId,
      startAt: s.startAt,
      endAt: s.endAt,
      peopleCount: s.peopleCount,
    })),
  );
}

export async function createReservation(formData: FormData) {
  await requireAuth();
  const data = await extractForm(formData);

  const [created] = await db
    .insert(reservations)
    .values({
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      startAt: data.startAt,
      endAt: data.endAt,
      dayHourlyRate: data.dayHourlyRate,
      nightHourlyRate: data.nightHourlyRate,
      platformId: data.platformId,
      platformCommissionPct: data.platformCommissionPct,
      commissionAmount: data.commissionAmount,
      taxInvoice: data.taxInvoice,
      subtotalAmount: data.subtotalAmount,
      vatAmount: data.vatAmount,
      totalAmount: data.totalAmount,
      tags: data.tags,
      notes: data.notes,
    })
    .returning();
  await replaceSegments(created.id, data.segments);

  const full = (await getReservation(created.id))!;
  try {
    const eventId = await pushCalendarEvent(full);
    if (eventId) {
      await db
        .update(reservations)
        .set({ googleEventId: eventId })
        .where(eq(reservations.id, created.id));
    }
  } catch (e) {
    console.error("Google Calendar push failed", e);
  }

  revalidatePath("/");
  revalidatePath("/reservations");
  redirect(`/reservations/${created.id}`);
}

export async function updateReservation(id: number, formData: FormData) {
  await requireAuth();
  const data = await extractForm(formData);
  const before = await getReservation(id);
  if (!before) throw new Error("예약을 찾을 수 없습니다");

  await db
    .update(reservations)
    .set({
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      startAt: data.startAt,
      endAt: data.endAt,
      dayHourlyRate: data.dayHourlyRate,
      nightHourlyRate: data.nightHourlyRate,
      platformId: data.platformId,
      platformCommissionPct: data.platformCommissionPct,
      commissionAmount: data.commissionAmount,
      taxInvoice: data.taxInvoice,
      subtotalAmount: data.subtotalAmount,
      vatAmount: data.vatAmount,
      totalAmount: data.totalAmount,
      tags: data.tags,
      notes: data.notes,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, id));
  await replaceSegments(id, data.segments);

  const after = (await getReservation(id))!;
  try {
    if (before.googleEventId) {
      await updateCalendarEvent(before.googleEventId, after);
    } else {
      const eventId = await pushCalendarEvent(after);
      if (eventId) {
        await db
          .update(reservations)
          .set({ googleEventId: eventId })
          .where(eq(reservations.id, id));
      }
    }
  } catch (e) {
    console.error("Google Calendar update failed", e);
  }

  revalidatePath("/");
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${id}`);
  redirect(`/reservations/${id}`);
}

export async function updateRefundAmount(id: number, formData: FormData) {
  await requireAuth();
  const rawValue = formData.get("refundAmount");
  const amount = Number(rawValue);
  if (rawValue === null || rawValue === "" || !Number.isFinite(amount) || amount < 0) {
    throw new Error("환불 금액은 0 이상이어야 합니다");
  }
  const existing = await getReservation(id);
  if (!existing) throw new Error("예약을 찾을 수 없습니다");
  if (existing.status !== "cancelled") {
    throw new Error("취소된 예약에서만 환불 금액을 수정할 수 있습니다");
  }
  const roundedAmount = Math.round(amount);
  if (roundedAmount > existing.totalAmount) {
    throw new Error("환불 금액은 총 매출을 초과할 수 없습니다");
  }
  const rate =
    existing.totalAmount > 0
      ? Math.round((roundedAmount / existing.totalAmount) * 100)
      : 0;
  await db
    .update(reservations)
    .set({
      refundAmount: roundedAmount,
      refundRatePct: rate,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, id));
  revalidatePath(`/reservations/${id}`);
  revalidatePath("/reservations");
  revalidatePath("/revenue");
  revalidatePath("/");
}

export async function updateCommissionAmount(id: number, formData: FormData) {
  await requireAuth();
  const rawValue = formData.get("commissionAmount");
  const amount = Number(rawValue);
  if (rawValue === null || rawValue === "" || !Number.isFinite(amount) || amount < 0) {
    throw new Error("수수료는 0 이상이어야 합니다");
  }
  const existing = await getReservation(id);
  if (!existing) throw new Error("예약을 찾을 수 없습니다");
  const result = await db
    .update(reservations)
    .set({ commissionAmount: Math.round(amount), updatedAt: new Date() })
    .where(eq(reservations.id, id))
    .returning({ id: reservations.id, commissionAmount: reservations.commissionAmount });
  if (result.length === 0) {
    throw new Error("수수료 업데이트 실패");
  }
  revalidatePath(`/reservations/${id}`);
  revalidatePath("/reservations");
  revalidatePath("/revenue");
  revalidatePath("/");
}

export async function cancelReservation(id: number) {
  await requireAuth();
  const existing = await getReservation(id);
  if (!existing) throw new Error("예약을 찾을 수 없습니다");

  const now = new Date();
  const refund = computeRefund(existing.startAt, existing.totalAmount, now);

  await db
    .update(reservations)
    .set({
      status: "cancelled",
      refundRatePct: refund.rate,
      refundAmount: refund.amount,
      cancelledAt: now,
      updatedAt: now,
    })
    .where(eq(reservations.id, id));

  if (existing.googleEventId) {
    try {
      await deleteCalendarEvent(existing.googleEventId);
      await db
        .update(reservations)
        .set({ googleEventId: null })
        .where(eq(reservations.id, id));
    } catch (e) {
      console.error("Google Calendar delete failed", e);
    }
  }

  revalidatePath("/");
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${id}`);
  revalidatePath("/revenue");
}

export async function restoreReservation(id: number) {
  await requireAuth();
  const existing = await getReservation(id);
  if (!existing) throw new Error("예약을 찾을 수 없습니다");

  await db
    .update(reservations)
    .set({
      status: "active",
      refundRatePct: 0,
      refundAmount: 0,
      cancelledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, id));

  try {
    const after = await getReservation(id);
    if (after && !after.googleEventId) {
      const eventId = await pushCalendarEvent(after);
      if (eventId) {
        await db
          .update(reservations)
          .set({ googleEventId: eventId })
          .where(eq(reservations.id, id));
      }
    }
  } catch (e) {
    console.error("Google Calendar push on restore failed", e);
  }

  revalidatePath("/");
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${id}`);
  revalidatePath("/revenue");
}

const extensionInputSchema = z.object({
  extraHours: z.coerce.number().refine((v) => v > 0 && (v * 2) % 1 === 0, {
    message: "연장 시간은 0.5시간 단위로 0보다 커야 합니다",
  }),
  peopleCount: z.coerce.number().int().min(1).max(1000),
  note: z.string().max(500).optional(),
});

export async function addReservationExtension(
  reservationId: number,
  formData: FormData,
) {
  await requireAuth();
  const parsed = extensionInputSchema.safeParse({
    extraHours: formData.get("extraHours"),
    peopleCount: formData.get("peopleCount"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const { extraHours, peopleCount } = parsed.data;
  const note = parsed.data.note?.trim() || null;

  const r = await getReservation(reservationId);
  if (!r) throw new Error("예약을 찾을 수 없습니다");
  if (r.status === "cancelled") {
    throw new Error("취소된 예약은 연장할 수 없습니다");
  }

  const newEndAt = new Date(r.endAt.getTime() + extraHours * 60 * 60 * 1000);
  const totalDuration =
    (newEndAt.getTime() - r.startAt.getTime()) / (60 * 60 * 1000);
  if (totalDuration > 24) {
    throw new Error("총 예약 시간은 24시간을 넘을 수 없습니다");
  }

  const { dayHours, nightHours } = splitDayNightHoursFromDates(
    r.endAt,
    newEndAt,
  );

  const settings = await getSettings();
  const baseExtensionAmount = Math.round(
    dayHours * r.dayHourlyRate + nightHours * r.nightHourlyRate,
  );
  const extraPeople = Math.max(0, peopleCount - settings.defaultMinPeople);
  const extensionPeopleCharge = Math.round(
    extraPeople * settings.extraPerPersonHourlyRate * extraHours,
  );
  const extensionAmount = baseExtensionAmount + extensionPeopleCharge;

  await db.insert(reservationExtensions).values({
    reservationId,
    extraHours,
    dayHours,
    nightHours,
    amount: extensionAmount,
    peopleCount,
    note,
  });

  await db.insert(reservationPeopleSegments).values({
    reservationId,
    startAt: r.endAt,
    endAt: newEndAt,
    peopleCount,
  });

  const allSegments = [
    ...r.peopleSegments.map((s) => ({
      startAt: s.startAt,
      endAt: s.endAt,
      peopleCount: s.peopleCount,
    })),
    { startAt: r.endAt, endAt: newEndAt, peopleCount },
  ];

  const recomputed = computeReservationAmounts({
    startAt: r.startAt,
    endAt: newEndAt,
    dayHourlyRate: r.dayHourlyRate,
    nightHourlyRate: r.nightHourlyRate,
    segments: allSegments,
    minPeople: settings.defaultMinPeople,
    extraPerPersonHourlyRate: settings.extraPerPersonHourlyRate,
    taxInvoice: r.taxInvoice,
    commissionPct: r.platformCommissionPct,
  });

  await db
    .update(reservations)
    .set({
      endAt: newEndAt,
      subtotalAmount: recomputed.subtotalAmount,
      vatAmount: recomputed.vatAmount,
      totalAmount: recomputed.totalAmount,
      commissionAmount: recomputed.commissionAmount,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, reservationId));

  if (r.googleEventId) {
    try {
      const after = await getReservation(reservationId);
      if (after) await updateCalendarEvent(r.googleEventId, after);
    } catch (e) {
      console.error("Google Calendar update failed", e);
    }
  }

  revalidatePath("/");
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/revenue");
}

export async function removeLatestReservationExtension(reservationId: number) {
  await requireAuth();
  const r = await getReservation(reservationId);
  if (!r) throw new Error("예약을 찾을 수 없습니다");
  if (r.status === "cancelled") {
    throw new Error("취소된 예약은 수정할 수 없습니다");
  }
  if (r.extensions.length === 0) {
    throw new Error("삭제할 연장 내역이 없습니다");
  }

  const latest = r.extensions[r.extensions.length - 1];
  const newEndAt = new Date(
    r.endAt.getTime() - latest.extraHours * 60 * 60 * 1000,
  );

  const settings = await getSettings();
  const minHours = settings.minBookingHours;
  const remainingDuration =
    (newEndAt.getTime() - r.startAt.getTime()) / (60 * 60 * 1000);
  if (remainingDuration < minHours) {
    throw new Error(`연장을 모두 취소하면 최소 예약 시간(${minHours}시간) 미만입니다`);
  }

  if (r.peopleSegments.length === 0) {
    throw new Error("인원 구간 데이터가 없습니다");
  }
  const lastSeg = r.peopleSegments[r.peopleSegments.length - 1];

  await db
    .delete(reservationExtensions)
    .where(eq(reservationExtensions.id, latest.id));
  await db
    .delete(reservationPeopleSegments)
    .where(eq(reservationPeopleSegments.id, lastSeg.id));

  const remainingSegments = r.peopleSegments.slice(0, -1).map((s) => ({
    startAt: s.startAt,
    endAt: s.endAt,
    peopleCount: s.peopleCount,
  }));

  // 마지막 세그먼트가 새 endAt과 일치하지 않으면 마지막 세그먼트의 endAt을 newEndAt으로 보정
  if (
    remainingSegments.length > 0 &&
    remainingSegments[remainingSegments.length - 1].endAt.getTime() !==
      newEndAt.getTime()
  ) {
    const tail = remainingSegments[remainingSegments.length - 1];
    const adjustedTail = { ...tail, endAt: newEndAt };
    remainingSegments[remainingSegments.length - 1] = adjustedTail;
    const tailRow = r.peopleSegments[r.peopleSegments.length - 2];
    if (tailRow) {
      await db
        .update(reservationPeopleSegments)
        .set({ endAt: newEndAt })
        .where(eq(reservationPeopleSegments.id, tailRow.id));
    }
  }

  const recomputed = computeReservationAmounts({
    startAt: r.startAt,
    endAt: newEndAt,
    dayHourlyRate: r.dayHourlyRate,
    nightHourlyRate: r.nightHourlyRate,
    segments: remainingSegments,
    minPeople: settings.defaultMinPeople,
    extraPerPersonHourlyRate: settings.extraPerPersonHourlyRate,
    taxInvoice: r.taxInvoice,
    commissionPct: r.platformCommissionPct,
  });

  await db
    .update(reservations)
    .set({
      endAt: newEndAt,
      subtotalAmount: recomputed.subtotalAmount,
      vatAmount: recomputed.vatAmount,
      totalAmount: recomputed.totalAmount,
      commissionAmount: recomputed.commissionAmount,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, reservationId));

  if (r.googleEventId) {
    try {
      const after = await getReservation(reservationId);
      if (after) await updateCalendarEvent(r.googleEventId, after);
    } catch (e) {
      console.error("Google Calendar update failed", e);
    }
  }

  revalidatePath("/");
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/revenue");
}

export async function setTaxInvoiceStatus(
  reservationId: number,
  formData: FormData,
) {
  await requireAuth();
  const raw = formData.get("status");
  if (raw !== "not_issued" && raw !== "in_progress" && raw !== "issued") {
    throw new Error("올바르지 않은 세금계산서 상태입니다");
  }
  const status = raw;

  const r = await getReservation(reservationId);
  if (!r) throw new Error("예약을 찾을 수 없습니다");
  if (!r.taxInvoice && status !== "not_issued") {
    throw new Error("세금계산서 발행 대상이 아닌 예약입니다");
  }

  const issued = status === "issued";
  await db
    .update(reservations)
    .set({
      taxInvoiceStatus: status,
      taxInvoiceIssued: issued,
      taxInvoiceIssuedAt: issued
        ? r.taxInvoiceIssuedAt ?? new Date()
        : null,
      updatedAt: new Date(),
    })
    .where(eq(reservations.id, reservationId));

  revalidatePath("/");
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/revenue");
}

export async function deleteReservation(id: number) {
  await requireAuth();
  const existing = await getReservation(id);
  if (!existing) throw new Error("예약을 찾을 수 없습니다");
  await db.delete(reservations).where(eq(reservations.id, id));

  if (existing.googleEventId) {
    try {
      await deleteCalendarEvent(existing.googleEventId);
    } catch (e) {
      console.error("Google Calendar delete failed", e);
    }
  }

  revalidatePath("/");
  revalidatePath("/reservations");
  revalidatePath("/revenue");
  redirect("/reservations");
}

export async function getReservation(
  id: number,
): Promise<ReservationWithSegments | null> {
  const row = await db.query.reservations.findFirst({
    where: eq(reservations.id, id),
    with: {
      peopleSegments: {
        orderBy: asc(reservationPeopleSegments.startAt),
      },
      platform: true,
      extensions: {
        orderBy: asc(reservationExtensions.createdAt),
      },
    },
  });
  return row ?? null;
}

type ListReservationOpts = {
  from?: Date;
  to?: Date;
  tag?: string;
  status?: "active" | "cancelled";
  platformId?: number;
  limit?: number;
  offset?: number;
};

function buildListConditions(opts: ListReservationOpts) {
  const conds = [] as any[];
  if (opts.from) conds.push(gte(reservations.startAt, opts.from));
  if (opts.to) conds.push(lt(reservations.startAt, opts.to));
  if (opts.tag) {
    conds.push(sql`${opts.tag} = ANY(${reservations.tags})`);
  }
  if (opts.status) {
    conds.push(eq(reservations.status, opts.status));
  }
  if (typeof opts.platformId === "number") {
    conds.push(eq(reservations.platformId, opts.platformId));
  }
  return conds;
}

export async function listReservations(
  opts: ListReservationOpts,
): Promise<ReservationWithSegments[]> {
  const conds = buildListConditions(opts);
  return db.query.reservations.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: desc(reservations.startAt),
    limit: opts.limit,
    offset: opts.offset,
    with: {
      peopleSegments: {
        orderBy: asc(reservationPeopleSegments.startAt),
      },
      platform: true,
      extensions: {
        orderBy: asc(reservationExtensions.createdAt),
      },
    },
  });
}

export async function countReservations(
  opts: ListReservationOpts,
): Promise<number> {
  const conds = buildListConditions(opts);
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(reservations)
    .where(conds.length ? and(...conds) : undefined);
  return row?.n ?? 0;
}

export async function summarizeReservations(opts: ListReservationOpts): Promise<{
  totalCount: number;
  activeCount: number;
  cancelledCount: number;
  activeTotalAmount: number;
}> {
  const conds = buildListConditions(opts);
  const [row] = await db
    .select({
      totalCount: sql<number>`count(*)`.mapWith(Number),
      activeCount:
        sql<number>`sum(case when ${reservations.status} = 'active' then 1 else 0 end)`.mapWith(
          Number,
        ),
      cancelledCount:
        sql<number>`sum(case when ${reservations.status} = 'cancelled' then 1 else 0 end)`.mapWith(
          Number,
        ),
      activeTotalAmount:
        sql<number>`coalesce(sum(case when ${reservations.status} = 'active' then ${reservations.totalAmount} else 0 end), 0)`.mapWith(
          Number,
        ),
    })
    .from(reservations)
    .where(conds.length ? and(...conds) : undefined);
  return {
    totalCount: Math.round(Number(row?.totalCount ?? 0)),
    activeCount: Math.round(Number(row?.activeCount ?? 0)),
    cancelledCount: Math.round(Number(row?.cancelledCount ?? 0)),
    activeTotalAmount: Math.round(Number(row?.activeTotalAmount ?? 0)),
  };
}

export async function listReservationsInMonth(
  year: number,
  month: number,
): Promise<ReservationWithSegments[]> {
  const { start, end } = monthRange(year, month);
  return db.query.reservations.findMany({
    where: and(gte(reservations.startAt, start), lt(reservations.startAt, end)),
    orderBy: asc(reservations.startAt),
    with: {
      peopleSegments: {
        orderBy: asc(reservationPeopleSegments.startAt),
      },
      platform: true,
      extensions: {
        orderBy: asc(reservationExtensions.createdAt),
      },
    },
  });
}

export async function getAllTags(): Promise<string[]> {
  const rows = await db
    .select({ tag: sql<string>`unnest(${reservations.tags})` })
    .from(reservations);
  return [...new Set(rows.map((r) => r.tag))].filter(Boolean).sort();
}
