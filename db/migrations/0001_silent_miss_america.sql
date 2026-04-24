ALTER TABLE "reservations" ADD COLUMN "people_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "extra_person_charge" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "default_min_people" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "extra_per_person_rate" integer DEFAULT 0 NOT NULL;