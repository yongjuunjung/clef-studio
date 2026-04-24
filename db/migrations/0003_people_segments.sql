ALTER TABLE "settings" RENAME COLUMN "extra_per_person_rate" TO "extra_per_person_hourly_rate";--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "min_booking_hours" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
CREATE TABLE "reservation_people_segments" (
  "id" serial PRIMARY KEY NOT NULL,
  "reservation_id" integer NOT NULL,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "people_count" integer NOT NULL,
  CONSTRAINT "reservation_people_segments_reservation_id_reservations_id_fk"
    FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE cascade
);--> statement-breakpoint
INSERT INTO "reservation_people_segments" ("reservation_id", "start_at", "end_at", "people_count")
SELECT "id", "start_at", "end_at", "people_count" FROM "reservations";--> statement-breakpoint
ALTER TABLE "reservations" DROP COLUMN "people_count";--> statement-breakpoint
ALTER TABLE "reservations" DROP COLUMN "extra_person_charge";
