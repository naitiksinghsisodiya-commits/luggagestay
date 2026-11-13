import { sqlite } from "./client";

const statements = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'TRAVELER',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS hotels (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  images TEXT NOT NULL,
  amenities TEXT NOT NULL,
  rating REAL NOT NULL DEFAULT 4.5,
  price_per_hour REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  total_capacity INTEGER NOT NULL DEFAULT 50,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS hotel_availability (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  date INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  booked INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS hotel_date_idx ON hotel_availability (hotel_id, date);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_code TEXT NOT NULL UNIQUE,
  traveler_id TEXT NOT NULL REFERENCES users(id),
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  drop_off_date INTEGER NOT NULL,
  drop_off_time TEXT NOT NULL,
  pick_up_date INTEGER NOT NULL,
  pick_up_time TEXT NOT NULL,
  luggage_count INTEGER NOT NULL,
  luggage_notes TEXT,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  total_price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  qr_code_data_url TEXT NOT NULL,
  checked_in_at INTEGER,
  checked_out_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export async function runMigrations() {
  await sqlite.executeMultiple(statements);
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Database schema is up to date.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
