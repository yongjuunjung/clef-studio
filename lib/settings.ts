import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, type Settings } from "@/db/schema";

const DEFAULT_ID = 1;

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(settings).where(eq(settings.id, DEFAULT_ID));
  if (rows.length > 0) return rows[0];
  const [created] = await db
    .insert(settings)
    .values({ id: DEFAULT_ID, dayHourlyRate: 0 })
    .returning();
  return created;
}

export async function updateSettings(
  patch: Partial<Omit<Settings, "id" | "updatedAt">>,
) {
  await getSettings();
  await db
    .update(settings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(settings.id, DEFAULT_ID));
}
