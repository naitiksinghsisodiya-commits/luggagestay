import { Router } from "express";
import { z } from "zod";
import { eq, and, or } from "drizzle-orm";
import { db } from "../db/client";
import { bookings, hotels, users, hotelAvailability } from "../db/schema";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { generateBookingCode, generateQrDataUrl, computePrice, dayRange } from "../utils/booking";

const router = Router();

const createSchema = z.object({
  hotelId: z.string(),
  dropOffDate: z.string(),
  dropOffTime: z.string(),
  pickUpDate: z.string(),
  pickUpTime: z.string(),
  luggageCount: z.number().int().min(1).max(20),
  luggageNotes: z.string().optional(),
});

// POST /api/bookings — traveler creates a booking
router.post("/", requireAuth, requireRole("TRAVELER"), async (req: AuthedRequest, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const data = parsed.data;

    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, data.hotelId));
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    const days = dayRange(data.dropOffDate, data.pickUpDate);

    const bookingCode = generateBookingCode();
    const qrCodeDataUrl = await generateQrDataUrl(JSON.stringify({ code: bookingCode, hotelId: hotel.id }));
    const totalPrice = computePrice({
      pricePerHour: hotel.pricePerHour,
      dropOffDate: data.dropOffDate,
      dropOffTime: data.dropOffTime,
      pickUpDate: data.pickUpDate,
      pickUpTime: data.pickUpTime,
      luggageCount: data.luggageCount,
    });

    try {
      const booking = await db.transaction(async (tx) => {
        // Reserve capacity for every day of the stay.
        for (const day of days) {
          const [existing] = await tx
            .select()
            .from(hotelAvailability)
            .where(and(eq(hotelAvailability.hotelId, hotel.id), eq(hotelAvailability.date, day)));
          const capacity = existing?.capacity ?? hotel.totalCapacity;
          const booked = existing?.booked ?? 0;
          if (capacity - booked < data.luggageCount) {
            throw new Error(`Not enough capacity on ${day.toISOString().slice(0, 10)}`);
          }
          if (existing) {
            await tx
              .update(hotelAvailability)
              .set({ booked: booked + data.luggageCount })
              .where(eq(hotelAvailability.id, existing.id));
          } else {
            await tx
              .insert(hotelAvailability)
              .values({ hotelId: hotel.id, date: day, capacity, booked: data.luggageCount });
          }
        }

        const [created] = await tx
          .insert(bookings)
          .values({
            bookingCode,
            travelerId: req.user!.id,
            hotelId: hotel.id,
            dropOffDate: new Date(data.dropOffDate),
            dropOffTime: data.dropOffTime,
            pickUpDate: new Date(data.pickUpDate),
            pickUpTime: data.pickUpTime,
            luggageCount: data.luggageCount,
            luggageNotes: data.luggageNotes,
            totalPrice,
            currency: hotel.currency,
            qrCodeDataUrl,
            status: "CONFIRMED",
          })
          .returning();
        return created;
      });

      res.status(201).json({ booking });
    } catch (err: any) {
      res.status(409).json({ error: err.message || "Could not complete booking" });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/mine — traveler's own bookings
router.get("/mine", requireAuth, requireRole("TRAVELER"), async (req: AuthedRequest, res, next) => {
  try {
    const rows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.travelerId, req.user!.id));
    const withHotel = await Promise.all(
      rows.map(async (b) => {
        const [hotel] = await db.select().from(hotels).where(eq(hotels.id, b.hotelId));
        return { ...b, hotel: hotel ?? null };
      })
    );
    withHotel.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    res.json({ bookings: withHotel });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:idOrCode
router.get("/:idOrCode", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(or(eq(bookings.id, req.params.idOrCode), eq(bookings.bookingCode, req.params.idOrCode)));
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, booking.hotelId));
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    const [traveler] = await db.select().from(users).where(eq(users.id, booking.travelerId));

    const isOwnerTraveler = req.user!.role === "TRAVELER" && req.user!.id === booking.travelerId;
    const isOwnerPartner = req.user!.role === "HOTEL_PARTNER" && req.user!.id === hotel.ownerId;
    const isAdmin = req.user!.role === "ADMIN";
    if (!isOwnerTraveler && !isOwnerPartner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({
      booking: {
        ...booking,
        hotel,
        traveler: traveler
          ? { id: traveler.id, name: traveler.name, email: traveler.email, phone: traveler.phone }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/check-in
router.post("/:id/check-in", requireAuth, requireRole("HOTEL_PARTNER"), async (req: AuthedRequest, res, next) => {
  try {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.id));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, booking.hotelId));
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    if (hotel.ownerId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    if (booking.status !== "CONFIRMED") {
      return res.status(409).json({ error: `Cannot check in a booking with status ${booking.status}` });
    }

    const [updated] = await db
      .update(bookings)
      .set({ status: "CHECKED_IN", checkedInAt: new Date() })
      .where(eq(bookings.id, booking.id))
      .returning();
    res.json({ booking: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/check-out
router.post("/:id/check-out", requireAuth, requireRole("HOTEL_PARTNER"), async (req: AuthedRequest, res, next) => {
  try {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.id));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, booking.hotelId));
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    if (hotel.ownerId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    if (booking.status !== "CHECKED_IN") {
      return res.status(409).json({ error: `Cannot check out a booking with status ${booking.status}` });
    }

    const updated = await db.transaction(async (tx) => {
      const days = dayRange(
        booking.dropOffDate.toISOString().slice(0, 10),
        booking.pickUpDate.toISOString().slice(0, 10)
      );
      for (const day of days) {
        const [row] = await tx
          .select()
          .from(hotelAvailability)
          .where(and(eq(hotelAvailability.hotelId, booking.hotelId), eq(hotelAvailability.date, day)));
        if (row) {
          await tx
            .update(hotelAvailability)
            .set({ booked: Math.max(0, row.booked - booking.luggageCount) })
            .where(eq(hotelAvailability.id, row.id));
        }
      }
      const [res2] = await tx
        .update(bookings)
        .set({ status: "CHECKED_OUT", checkedOutAt: new Date() })
        .where(eq(bookings.id, booking.id))
        .returning();
      return res2;
    });

    res.json({ booking: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/cancel
router.post("/:id/cancel", requireAuth, requireRole("TRAVELER"), async (req: AuthedRequest, res, next) => {
  try {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.id));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.travelerId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return res.status(409).json({ error: `Cannot cancel a booking with status ${booking.status}` });
    }

    const updated = await db.transaction(async (tx) => {
      const days = dayRange(
        booking.dropOffDate.toISOString().slice(0, 10),
        booking.pickUpDate.toISOString().slice(0, 10)
      );
      for (const day of days) {
        const [row] = await tx
          .select()
          .from(hotelAvailability)
          .where(and(eq(hotelAvailability.hotelId, booking.hotelId), eq(hotelAvailability.date, day)));
        if (row) {
          await tx
            .update(hotelAvailability)
            .set({ booked: Math.max(0, row.booked - booking.luggageCount) })
            .where(eq(hotelAvailability.id, row.id));
        }
      }
      const [res2] = await tx
        .update(bookings)
        .set({ status: "CANCELLED" })
        .where(eq(bookings.id, booking.id))
        .returning();
      return res2;
    });

    res.json({ booking: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
