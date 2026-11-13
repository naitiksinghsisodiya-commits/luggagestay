import { Router } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../db/client";
import { hotels, hotelAvailability } from "../db/schema";
import { toDayKey, dayRange } from "../utils/booking";

const router = Router();

function serializeHotel(hotel: typeof hotels.$inferSelect) {
  return {
    id: hotel.id,
    name: hotel.name,
    description: hotel.description,
    address: hotel.address,
    city: hotel.city,
    country: hotel.country,
    lat: hotel.lat,
    lng: hotel.lng,
    images: JSON.parse(hotel.images),
    amenities: JSON.parse(hotel.amenities),
    rating: hotel.rating,
    pricePerHour: hotel.pricePerHour,
    currency: hotel.currency,
    totalCapacity: hotel.totalCapacity,
  };
}

// GET /api/hotels?city=&date=&minPrice=&maxPrice=&minRating=&amenities=wifi,ac&q=
router.get("/", async (req, res, next) => {
  try {
    const { city, date, minPrice, maxPrice, minRating, amenities, q } = req.query as Record<
      string,
      string | undefined
    >;

    const allHotels = await db.select().from(hotels);
    let results = allHotels.map(serializeHotel);

    if (city) {
      results = results.filter((h) => h.city.toLowerCase().includes(city.toLowerCase()));
    }
    if (q) {
      const needle = q.toLowerCase();
      results = results.filter(
        (h) => h.name.toLowerCase().includes(needle) || h.address.toLowerCase().includes(needle)
      );
    }
    if (minPrice) results = results.filter((h) => h.pricePerHour >= Number(minPrice));
    if (maxPrice) results = results.filter((h) => h.pricePerHour <= Number(maxPrice));
    if (minRating) results = results.filter((h) => h.rating >= Number(minRating));
    if (amenities) {
      const wanted = amenities.split(",").map((a) => a.trim().toLowerCase());
      results = results.filter((h) =>
        wanted.every((w) => h.amenities.map((a: string) => a.toLowerCase()).includes(w))
      );
    }

    if (date) {
      const key = toDayKey(date).getTime();
      const rows = await db.select().from(hotelAvailability);
      const byHotel = new Map<string, { capacity: number; booked: number }>();
      for (const r of rows) {
        if (new Date(r.date).getTime() === key) byHotel.set(r.hotelId, r);
      }
      results = results.filter((h) => {
        const row = byHotel.get(h.id);
        if (!row) return true; // no row yet = assume full capacity free (demo default)
        return row.capacity - row.booked > 0;
      });
    }

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, req.params.id));
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    const availability = await db
      .select()
      .from(hotelAvailability)
      .where(eq(hotelAvailability.hotelId, hotel.id));

    res.json({
      hotel: serializeHotel(hotel),
      availability: availability
        .map((a) => ({
          date: new Date(a.date).toISOString().slice(0, 10),
          capacity: a.capacity,
          booked: a.booked,
          free: a.capacity - a.booked,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/hotels/:id/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/:id/availability", async (req, res, next) => {
  try {
    const { from, to } = req.query as Record<string, string | undefined>;
    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, req.params.id));
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    const start = from || new Date().toISOString().slice(0, 10);
    const end = to || new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10);
    const days = dayRange(start, end);

    const rows = await db
      .select()
      .from(hotelAvailability)
      .where(
        and(
          eq(hotelAvailability.hotelId, hotel.id),
          gte(hotelAvailability.date, days[0]),
          lte(hotelAvailability.date, days[days.length - 1])
        )
      );
    const byDate = new Map(rows.map((r) => [new Date(r.date).getTime(), r]));

    const availability = days.map((d) => {
      const row = byDate.get(d.getTime());
      const capacity = row?.capacity ?? hotel.totalCapacity;
      const booked = row?.booked ?? 0;
      return { date: d.toISOString().slice(0, 10), capacity, booked, free: capacity - booked };
    });

    res.json({ availability });
  } catch (err) {
    next(err);
  }
});

export default router;
