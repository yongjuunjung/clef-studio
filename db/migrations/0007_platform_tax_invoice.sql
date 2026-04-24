ALTER TABLE "platforms" DROP COLUMN "price_uplift_pct";--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "tax_invoice_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" DROP COLUMN "platform_uplift_pct";
