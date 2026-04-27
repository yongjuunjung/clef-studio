import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const platforms = pgTable("clef_platforms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  commissionRatePct: real("commission_rate_pct").notNull().default(0),
  taxInvoiceRequired: boolean("tax_invoice_required").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const reservations = pgTable("clef_reservations", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 30 }),
  customerEmail: varchar("customer_email", { length: 200 }),
  startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
  dayHourlyRate: integer("day_hourly_rate").notNull(),
  nightHourlyRate: integer("night_hourly_rate").notNull().default(0),
  taxInvoice: boolean("tax_invoice").notNull().default(false),
  taxInvoiceIssued: boolean("tax_invoice_issued").notNull().default(false),
  taxInvoiceIssuedAt: timestamp("tax_invoice_issued_at", {
    withTimezone: true,
    mode: "date",
  }),
  taxInvoiceStatus: varchar("tax_invoice_status", { length: 20 })
    .notNull()
    .default("not_issued"),
  platformId: integer("platform_id").references(() => platforms.id, {
    onDelete: "set null",
  }),
  platformCommissionPct: real("platform_commission_pct").notNull().default(0),
  commissionAmount: integer("commission_amount").notNull().default(0),
  subtotalAmount: integer("subtotal_amount").notNull().default(0),
  vatAmount: integer("vat_amount").notNull().default(0),
  totalAmount: integer("total_amount").notNull(),
  tags: text("tags").array().notNull().default([]),
  notes: text("notes"),
  googleEventId: varchar("google_event_id", { length: 200 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  refundRatePct: integer("refund_rate_pct").notNull().default(0),
  refundAmount: integer("refund_amount").notNull().default(0),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const reservationPeopleSegments = pgTable(
  "clef_reservation_people_segments",
  {
    id: serial("id").primaryKey(),
    reservationId: integer("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
    peopleCount: integer("people_count").notNull(),
  },
);

export const reservationExtensions = pgTable("clef_reservation_extensions", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  extraHours: real("extra_hours").notNull(),
  dayHours: real("day_hours").notNull().default(0),
  nightHours: real("night_hours").notNull().default(0),
  amount: integer("amount").notNull(),
  peopleCount: integer("people_count").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const reservationsRelations = relations(reservations, ({ many, one }) => ({
  peopleSegments: many(reservationPeopleSegments),
  extensions: many(reservationExtensions),
  platform: one(platforms, {
    fields: [reservations.platformId],
    references: [platforms.id],
  }),
}));

export const segmentsRelations = relations(
  reservationPeopleSegments,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationPeopleSegments.reservationId],
      references: [reservations.id],
    }),
  }),
);

export const extensionsRelations = relations(
  reservationExtensions,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationExtensions.reservationId],
      references: [reservations.id],
    }),
  }),
);

export const settings = pgTable("clef_settings", {
  id: integer("id").primaryKey().default(1),
  dayHourlyRate: integer("day_hourly_rate").notNull().default(0),
  nightHourlyRate: integer("night_hourly_rate").notNull().default(0),
  defaultMinPeople: integer("default_min_people").notNull().default(1),
  extraPerPersonHourlyRate: integer("extra_per_person_hourly_rate")
    .notNull()
    .default(0),
  minBookingHours: integer("min_booking_hours").notNull().default(2),
  googleRefreshToken: text("google_refresh_token"),
  googleCalendarId: text("google_calendar_id"),
  googleConnectedEmail: text("google_connected_email"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type PeopleSegment = typeof reservationPeopleSegments.$inferSelect;
export type NewPeopleSegment = typeof reservationPeopleSegments.$inferInsert;
export type Platform = typeof platforms.$inferSelect;
export type NewPlatform = typeof platforms.$inferInsert;
export type ReservationExtension = typeof reservationExtensions.$inferSelect;
export type NewReservationExtension = typeof reservationExtensions.$inferInsert;
export type ReservationWithSegments = Reservation & {
  peopleSegments: PeopleSegment[];
  platform: Platform | null;
  extensions: ReservationExtension[];
};
export type Settings = typeof settings.$inferSelect;
