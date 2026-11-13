import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users, hotels, bookings } from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

// GET /api/admin/stats
router.get("/stats", async (_req, res, next) => {
  try {
    const allUsers = await db.select().from(users);
    const allHotels = await db.select().from(hotels);
    const allBookings = await db.select().from(bookings);

    const travelers = allUsers.filter((u) => u.role === "TRAVELER").length;
    const partners = allUsers.filter((u) => u.role === "HOTEL_PARTNER").length;
    const totalRevenue = allBookings
      .filter((b) => ["CHECKED_OUT", "CHECKED_IN", "CONFIRMED"].includes(b.status))
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const byStatus: Record<string, number> = {};
    for (const b of allBookings) byStatus[b.status] = (byStatus[b.status] || 0) + 1;

    res.json({
      travelers,
      partners,
      hotels: allHotels.length,
      bookings: allBookings.length,
      totalRevenue,
      byStatus,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
router.get("/users", async (_req, res, next) => {
  try {
    const rows = await db.select().from(users);
    res.json({
      users: rows
        .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, createdAt: u.createdAt }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/hotels
router.get("/hotels", async (_req, res, next) => {
  try {
    const rows = await db.select().from(hotels);
    const hotelsWithOwners = await Promise.all(
      rows.map(async (h) => {
        const [owner] = await db.select().from(users).where(eq(users.id, h.ownerId));
        return {
          id: h.id,
          name: h.name,
          city: h.city,
          rating: h.rating,
          totalCapacity: h.totalCapacity,
          pricePerHour: h.pricePerHour,
          owner: owner ? { name: owner.name, email: owner.email } : null,
        };
      })
    );
    res.json({ hotels: hotelsWithOwners });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/bookings?status=
router.get("/bookings", async (req, res, next) => {
  try {
    const { status } = req.query as Record<string, string | undefined>;
    let rows = await db.select().from(bookings);
    if (status) rows = rows.filter((b) => b.status === status);
    rows = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 200);

    const enriched = await Promise.all(
      rows.map(async (b) => {
        const [hotel] = await db.select().from(hotels).where(eq(hotels.id, b.hotelId));
        const [traveler] = await db.select().from(users).where(eq(users.id, b.travelerId));
        return {
          ...b,
          hotel: hotel ? { name: hotel.name, city: hotel.city } : null,
          traveler: traveler ? { name: traveler.name, email: traveler.email } : null,
        };
      })
    );

    res.json({ bookings: enriched });
  } catch (err) {
    next(err);
  }
});

export default router;
