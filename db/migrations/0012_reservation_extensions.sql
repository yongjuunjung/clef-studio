CREATE TABLE "clef_reservation_extensions" (
	"id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"extra_hours" real NOT NULL,
	"day_hours" real DEFAULT 0 NOT NULL,
	"night_hours" real DEFAULT 0 NOT NULL,
	"amount" integer NOT NULL,
	"people_count" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clef_reservation_extensions" ADD CONSTRAINT "clef_reservation_extensions_reservation_id_clef_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."clef_reservations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "clef_reservation_extensions_reservation_id_idx" ON "clef_reservation_extensions" ("reservation_id");
