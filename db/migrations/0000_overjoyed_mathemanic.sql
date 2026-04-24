CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" varchar(100) NOT NULL,
	"customer_phone" varchar(30),
	"customer_email" varchar(200),
	"start_at" timestamp with time zone NOT NULL,
	"hours" integer NOT NULL,
	"hourly_rate" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"google_event_id" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"default_hourly_rate" integer DEFAULT 0 NOT NULL,
	"google_refresh_token" text,
	"google_calendar_id" text,
	"google_connected_email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
