ALTER TABLE "reservations" ADD COLUMN "tax_invoice" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "subtotal_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "vat_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "reservations" SET "subtotal_amount" = "total_amount", "vat_amount" = 0;
