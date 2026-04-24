ALTER TABLE "reservations" ADD COLUMN "refund_rate_pct" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "refund_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
UPDATE "reservations"
SET "refund_rate_pct" = 100,
    "refund_amount" = "total_amount",
    "cancelled_at" = now()
WHERE "status" = 'cancelled';
