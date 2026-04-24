ALTER TABLE "reservations" ADD COLUMN "commission_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "reservations"
SET "commission_amount" = ROUND("subtotal_amount" * "platform_commission_pct" / 100.0);
