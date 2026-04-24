"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { platforms, type Platform } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

export async function listPlatforms(): Promise<Platform[]> {
  return db.select().from(platforms).orderBy(asc(platforms.name));
}

export async function getPlatform(id: number): Promise<Platform | null> {
  const [row] = await db.select().from(platforms).where(eq(platforms.id, id));
  return row ?? null;
}

export async function createPlatform(formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  const commission = Number(formData.get("commissionRatePct"));
  const taxInvoiceRequired = formData.get("taxInvoiceRequired") === "on";
  if (name.length === 0 || name.length > 100) {
    throw new Error("플랫폼 이름을 1~100자로 입력하세요");
  }
  if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
    throw new Error("수수료 %는 0~100 사이여야 합니다");
  }
  await db.insert(platforms).values({
    name,
    commissionRatePct: commission,
    taxInvoiceRequired,
  });
  revalidatePath("/settings");
  redirect("/settings#platforms");
}

export async function deletePlatform(id: number) {
  await requireAuth();
  await db.delete(platforms).where(eq(platforms.id, id));
  revalidatePath("/settings");
  redirect("/settings#platforms");
}
