ALTER TABLE "clef_reservations" ADD COLUMN "tax_invoice_issued" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clef_reservations" ADD COLUMN "tax_invoice_issued_at" timestamp with time zone;
