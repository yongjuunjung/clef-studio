ALTER TABLE "clef_reservations" ADD COLUMN "tax_invoice_status" varchar(20) DEFAULT 'not_issued' NOT NULL;--> statement-breakpoint
UPDATE "clef_reservations" SET "tax_invoice_status" = 'issued' WHERE "tax_invoice_issued" = true;
