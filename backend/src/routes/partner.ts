import { Router } from "express";
import { z } from "zod";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../db/client";
import { hotels, hotelAvailability, bookings, users } from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { toDayKey, dayRange } from "../utils/booking";

const router = Router();
router.use(requireAuth, requireRole("HOTEL_PARTNER"));

async function getOwnedHotel(userId: string) {
  const [hotel] = await db.select().from(hotels).where(eq(hotels.ownerId, userId));
  return hotel;
}

// GET /api/partner/hotel
router.get("/hotel", async (req: AuthedRequest, res, next) => {
  try {
    const hotel = await getOwnedHotel(req.user!.id);
    if (!hotel) return res.status(404).json({ error: "No hotel profile found for this account" });
    res.json({ hotel: { ...hotel, images: JSON.parse(hotel.images), amenities: JSON.parse(hotel.amenities) } });
  } catch (err) {
    next(err);
  }
});

const updateHotelSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  totalCapacity: z.number().int().positive().optional(),
  pricePerHour: z.number().positive().optional(),
  amenities: z.array(z.string()).optional(),
});

// PATCH /api/partner/hotel
router.patch("/hotel", async (req: AuthedRequest, res, next) => {
  try {
    const parsed = updateHotelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const hotel = await getOwnedHotel(req.user!.id);
    if (!hotel) return res.status(404).json({ error: "No hotel profile found" });

    const { amenities, ...rest } = parsed.data;
    const [updated] = await db
      .update(hotels)
      .set({ ...rest, ...(amenities ? { amenities: JSON.stringify(amenities) } : {}), updatedAt: new Date() })
      .where(eq(hotels.id, hotel.id))
      .returning();

    res.json({ hotel: { ...updated, images: JSON.parse(updated.images), amenities: JSON.parse(updated.amenities) } });
  } catch (err) {
    next(err);
  }
});

const createHotelSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  address: z.string().min(3),
  city: z.string().min(2),
  country: z.string().default("India"),
  lat: z.number().default(25.5941),
  lng: z.number().default(85.1376),
  totalCapacity: z.number().int().positive().default(30),
  pricePerHour: z.number().positive(),
  amenities: z.array(z.string()).default([]),
});

// POST /api/partner/hotel — first-time hotel profile setup for a new partner
router.post("/hotel", async (req: AuthedRequest, res, next) => {
  try {
    const existing = await getOwnedHotel(req.user!.id);
    if (existing) return res.status(409).json({ error: "This account already has a hotel profile" });

    const parsed = createHotelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const data = parsed.data;

    const [hotel] = await db
      .insert(hotels)
      .values({
        ownerId: req.user!.id,
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        country: data.country,
        lat: data.lat,
        lng: data.lng,
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
        ]),
        amenities: JSON.stringify(data.amenities),
        pricePerHour: data.pricePerHour,
        totalCapacity: data.totalCapacity,
      })
      .returning();

    res.status(201).json({ hotel: { ...hotel, images: JSON.parse(hotel.images), amenities: JSON.parse(hotel.amenities) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/partner/availability?from=&to=
router.get("/availability", async (req: AuthedRequest, res, next) => {
  try {
    const hotel = await getOwnedHotel(req.user!.id);
    if (!hotel) return res.status(404).json({ error: "No hotel profile found" });

    const { from, to } = req.query as Record<string, string | undefined>;
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

const setCapacitySchema = z.object({ date: z.string(), capacity: z.number().int().min(0) });

// POST /api/partner/availability
router.post("/availability", async (req: AuthedRequest, res, next) => {
  try {
    const parsed = setCapacitySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const hotel = await getOwnedHotel(req.user!.id);
    if (!hotel) return res.status(404).json({ error: "No hotel profile found" });

    const day = toDayKey(parsed.data.date);
    const [existing] = await db
      .select()
      .from(hotelAvailability)
      .where(and(eq(hotelAvailability.hotelId, hotel.id), eq(hotelAvailability.date, day)));

    if (parsed.data.capacity < (existing?.booked ?? 0)) {
      return res.status(400).json({ error: "Capacity cannot be lower than bags already booked" });
    }

    const [row] = existing
      ? await db
          .update(hotelAvailability)
          .set({ capacity: parsed.data.capacity })
          .where(eq(hotelAvailability.id, existing.id))
          .returning()
      : await db
          .insert(hotelAvailability)
          .values({ hotelId: hotel.id, date: day, capacity: parsed.data.capacity, booked: 0 })
          .returning();

    res.json({
      availability: {
        date: new Date(row.date).toISOString().slice(0, 10),
        capacity: row.capacity,
        booked: row.booked,
        free: row.capacity - row.booked,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/partner/bookings?status=
router.get("/bookings", async (req: AuthedRequest, res, next) => {
  try {
    const hotel = await getOwnedHotel(req.user!.id);
    if (!hotel) return res.status(404).json({ error: "No hotel profile found" });

    const { status } = req.query as Record<string, string | undefined>;
    const rows = await db
      .select()
      .from(bookings)
      .where(
        status
          ? and(eq(bookings.hotelId, hotel.id), eq(bookings.status, status as any))
          : eq(bookings.hotelId, hotel.id)
      );

    const withTraveler = await Promise.all(
      rows.map(async (b) => {
        const [traveler] = await db.select().from(users).where(eq(users.id, b.travelerId));
        return {
          ...b,
          traveler: traveler
            ? { id: traveler.id, name: traveler.name, email: traveler.email, phone: traveler.phone }
            : null,
        };
      })
    );
    withTraveler.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({ bookings: withTraveler });
  } catch (err) {
    next(err);
  }
});

// GET /api/partner/stats
router.get("/stats", async (req: AuthedRequest, res, next) => {
  try {
    const hotel = await getOwnedHotel(req.user!.id);
    if (!hotel) return res.status(404).json({ error: "No hotel profile found" });

    const rows = await db.select().from(bookings).where(eq(bookings.hotelId, hotel.id));
    const totalBookings = rows.length;
    const awaitingDropOff = rows.filter((b) => b.status === "CONFIRMED").length;
    const currentlyStored = rows.filter((b) => b.status === "CHECKED_IN").length;
    const completed = rows.filter((b) => b.status === "CHECKED_OUT").length;
    const totalRevenue = rows
      .filter((b) => ["CHECKED_OUT", "CHECKED_IN", "CONFIRMED"].includes(b.status))
      .reduce((sum, b) => sum + b.totalPrice, 0);

    res.json({ totalBookings, awaitingDropOff, currentlyStored, completed, totalRevenue });
  } catch (err) {
    next(err);
  }
});

export default router;
