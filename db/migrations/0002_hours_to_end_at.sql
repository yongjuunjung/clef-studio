ALTER TABLE "reservations" ADD COLUMN "end_at" timestamp with time zone;--> statement-breakpoint
UPDATE "reservations" SET "end_at" = "start_at" + ("hours" || ' hours')::interval;--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "end_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" DROP COLUMN "hours";
