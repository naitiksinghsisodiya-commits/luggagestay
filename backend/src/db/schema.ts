import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// --- Design note on future Postgres migration -----------------------------
// This file uses drizzle-orm/sqlite-core. To migrate to Postgres later:
//   1. Swap imports to drizzle-orm/pg-core (pgTable, text, integer, doublePrecision, etc).
//   2. Swap the driver in src/db/client.ts from @libsql/client to postgres-js/pg.
//   3. Re-run `drizzle-kit generate` against the Postgres schema.
// Column names, relations, and every query in the route files stay the same
// because we only use drizzle-orm's query builder, not SQLite-specific SQL.
// ---------------------------------------------------------------------------

export const roleValues = ["TRAVELER", "HOTEL_PARTNER", "ADMIN"] as const;
export type Role = (typeof roleValues)[number];

export const bookingStatusValues = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
] as const;
export type BookingStatus = (typeof bookingStatusValues)[number];

function cuid() {
  // Lightweight unique id generator (avoids pulling in an extra dependency).
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(cuid),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role", { enum: roleValues }).notNull().default("TRAVELER"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const hotels = sqliteTable("hotels", {
  id: text("id").primaryKey().$defaultFn(cuid),
  ownerId: text("owner_id").notNull().unique().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  images: text("images").notNull(), // JSON-encoded string[]
  amenities: text("amenities").notNull(), // JSON-encoded string[]
  rating: real("rating").notNull().default(4.5),
  pricePerHour: real("price_per_hour").notNull(),
  currency: text("currency").notNull().default("INR"),
  totalCapacity: integer("total_capacity").notNull().default(50),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const hotelAvailability = sqliteTable(
  "hotel_availability",
  {
    id: text("id").primaryKey().$defaultFn(cuid),
    hotelId: text("hotel_id").notNull().references(() => hotels.id),
    date: integer("date", { mode: "timestamp_ms" }).notNull(), // UTC-midnight day key
    capacity: integer("capacity").notNull(),
    booked: integer("booked").notNull().default(0),
  },
  (table) => ({
    hotelDateIdx: uniqueIndex("hotel_date_idx").on(table.hotelId, table.date),
  })
);

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey().$defaultFn(cuid),
  bookingCode: text("booking_code").notNull().unique(),
  travelerId: text("traveler_id").notNull().references(() => users.id),
  hotelId: text("hotel_id").notNull().references(() => hotels.id),
  dropOffDate: integer("drop_off_date", { mode: "timestamp_ms" }).notNull(),
  dropOffTime: text("drop_off_time").notNull(),
  pickUpDate: integer("pick_up_date", { mode: "timestamp_ms" }).notNull(),
  pickUpTime: text("pick_up_time").notNull(),
  luggageCount: integer("luggage_count").notNull(),
  luggageNotes: text("luggage_notes"),
  status: text("status", { enum: bookingStatusValues }).notNull().default("CONFIRMED"),
  totalPrice: real("total_price").notNull(),
  currency: text("currency").notNull().default("INR"),
  qrCodeDataUrl: text("qr_code_data_url").notNull(),
  checkedInAt: integer("checked_in_at", { mode: "timestamp_ms" }),
  checkedOutAt: integer("checked_out_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  hotel: one(hotels, { fields: [users.id], references: [hotels.ownerId] }),
  bookings: many(bookings),
}));

export const hotelsRelations = relations(hotels, ({ one, many }) => ({
  owner: one(users, { fields: [hotels.ownerId], references: [users.id] }),
  availability: many(hotelAvailability),
  bookings: many(bookings),
}));

export const hotelAvailabilityRelations = relations(hotelAvailability, ({ one }) => ({
  hotel: one(hotels, { fields: [hotelAvailability.hotelId], references: [hotels.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  traveler: one(users, { fields: [bookings.travelerId], references: [users.id] }),
  hotel: one(hotels, { fields: [bookings.hotelId], references: [hotels.id] }),
}));
