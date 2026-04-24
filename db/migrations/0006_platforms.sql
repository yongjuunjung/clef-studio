CREATE TABLE "platforms" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "commission_rate_pct" real DEFAULT 0 NOT NULL,
  "price_uplift_pct" real DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "platform_id" integer REFERENCES "platforms"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "platform_uplift_pct" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "platform_commission_pct" real DEFAULT 0 NOT NULL;
