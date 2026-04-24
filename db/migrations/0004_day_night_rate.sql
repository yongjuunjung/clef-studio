ALTER TABLE "settings" RENAME COLUMN "default_hourly_rate" TO "day_hourly_rate";--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "night_hourly_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" RENAME COLUMN "hourly_rate" TO "day_hourly_rate";--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "night_hourly_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "reservations" SET "night_hourly_rate" = "day_hourly_rate";
