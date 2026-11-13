import "dotenv/config";
import bcrypt from "bcryptjs";
import { runMigrations } from "./migrate";
import { db, sqlite } from "./client";
import { users, hotels, hotelAvailability, bookings } from "./schema";
import { generateBookingCode, generateQrDataUrl, computePrice, dayRange } from "../utils/booking";

async function main() {
  await runMigrations();

  console.log("Clearing existing data...");
  await sqlite.executeMultiple(`
    DELETE FROM bookings;
    DELETE FROM hotel_availability;
    DELETE FROM hotels;
    DELETE FROM users;
  `);

  const password = await bcrypt.hash("password123", 10);

  console.log("Creating users...");
  const [admin] = await db
    .insert(users)
    .values({ name: "Asha Mehta", email: "admin@luggagestay.demo", passwordHash: password, role: "ADMIN", phone: "+91 90000 00001" })
    .returning();

  const partnerSeed = [
    { name: "Rohan Kapoor", email: "partner.taj@luggagestay.demo" },
    { name: "Meera Iyer", email: "partner.oberoi@luggagestay.demo" },
    { name: "Daniel Fischer", email: "partner.marriott@luggagestay.demo" },
    { name: "Priya Nair", email: "partner.ginger@luggagestay.demo" },
    { name: "Thomas Alva", email: "partner.lemontree@luggagestay.demo" },
    { name: "Sana Sheikh", email: "partner.ibis@luggagestay.demo" },
  ];
  const partners: Array<typeof users.$inferSelect> = [];
  for (const p of partnerSeed) {
    const [partner] = await db
      .insert(users)
      .values({ name: p.name, email: p.email, passwordHash: password, role: "HOTEL_PARTNER", phone: "+91 90000 00002" })
      .returning();
    partners.push(partner);
  }

  const travelerSeed = [
    { name: "Aditi Sharma", email: "aditi@traveler.demo" },
    { name: "Vikram Singh", email: "vikram@traveler.demo" },
    { name: "Emily Clarke", email: "emily@traveler.demo" },
    { name: "Carlos Rivera", email: "carlos@traveler.demo" },
  ];
  const travelers: Array<typeof users.$inferSelect> = [];
  for (const t of travelerSeed) {
    const [traveler] = await db
      .insert(users)
      .values({ name: t.name, email: t.email, passwordHash: password, role: "TRAVELER", phone: "+91 90000 00003" })
      .returning();
    travelers.push(traveler);
  }

  console.log("Creating hotels...");
  const hotelSeed = [
    {
      owner: partners[0],
      name: "Taj City Centre",
      description:
        "A landmark 5-star hotel in the heart of the business district, offering secure concierge luggage storage with 24/7 staffed access.",
      address: "1 Fraser Road",
      city: "Patna",
      country: "India",
      lat: 25.6093,
      lng: 85.1376,
      images: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
      ],
      amenities: ["24/7 access", "CCTV monitored", "Climate controlled", "Fragile item handling"],
      rating: 4.8,
      pricePerHour: 25,
      totalCapacity: 60,
    },
    {
      owner: partners[1],
      name: "The Oberoi Riverside",
      description:
        "Riverside luxury property with a dedicated luggage room, ideal for travelers in transit between train and flight connections.",
      address: "22 Gandhi Maidan Road",
      city: "Patna",
      country: "India",
      lat: 25.6161,
      lng: 85.1442,
      images: [
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
      ],
      amenities: ["24/7 access", "CCTV monitored", "Insured storage", "Porter assistance"],
      rating: 4.6,
      pricePerHour: 20,
      totalCapacity: 45,
    },
    {
      owner: partners[2],
      name: "Marriott Airport Suites",
      description:
        "Steps from the airport terminal, with a bonded luggage hold perfect for early arrivals and late departures.",
      address: "Airport Road",
      city: "Patna",
      country: "India",
      lat: 25.5912,
      lng: 85.0880,
      images: [
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800",
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
      ],
      amenities: ["24/7 access", "Climate controlled", "Fast check-in", "CCTV monitored"],
      rating: 4.5,
      pricePerHour: 30,
      totalCapacity: 80,
    },
    {
      owner: partners[3],
      name: "Ginger Patna",
      description:
        "A budget-friendly, no-frills hotel offering affordable short-term luggage storage with simple drop-and-go service.",
      address: "Boring Road",
      city: "Patna",
      country: "India",
      lat: 25.6198,
      lng: 85.1104,
      images: [
        "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
      ],
      amenities: ["CCTV monitored", "Affordable rates"],
      rating: 4.1,
      pricePerHour: 12,
      totalCapacity: 30,
    },
    {
      owner: partners[4],
      name: "Lemon Tree Premier",
      description:
        "Centrally located with a spacious storage area and friendly staff, popular with backpackers and business travelers alike.",
      address: "Exhibition Road",
      city: "Patna",
      country: "India",
      lat: 25.6145,
      lng: 85.1312,
      images: [
        "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800",
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800",
      ],
      amenities: ["24/7 access", "Climate controlled", "CCTV monitored", "Porter assistance"],
      rating: 4.4,
      pricePerHour: 18,
      totalCapacity: 50,
    },
    {
      owner: partners[5],
      name: "Ibis Patna Station",
      description:
        "Directly opposite the railway station, offering quick-access luggage storage for travelers with tight connections.",
      address: "Station Road",
      city: "Patna",
      country: "India",
      lat: 25.6012,
      lng: 85.1486,
      images: [
        "https://images.unsplash.com/photo-1551776235-dde6d482980b?w=800",
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800",
      ],
      amenities: ["24/7 access", "Fast check-in", "CCTV monitored"],
      rating: 4.3,
      pricePerHour: 15,
      totalCapacity: 40,
    },
  ];

  const createdHotels: Array<typeof hotels.$inferSelect> = [];
  for (const h of hotelSeed) {
    const [created] = await db
      .insert(hotels)
      .values({
        ownerId: h.owner.id,
        name: h.name,
        description: h.description,
        address: h.address,
        city: h.city,
        country: h.country,
        lat: h.lat,
        lng: h.lng,
        images: JSON.stringify(h.images),
        amenities: JSON.stringify(h.amenities),
        rating: h.rating,
        pricePerHour: h.pricePerHour,
        totalCapacity: h.totalCapacity,
      })
      .returning();
    createdHotels.push(created);
  }

  console.log("Seeding 14 days of availability per hotel...");
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10);
  const days = dayRange(today, horizon);
  for (const hotel of createdHotels) {
    for (const day of days) {
      // Vary booked count a bit so the calendar looks realistic, not empty.
      const booked = Math.floor(Math.random() * hotel.totalCapacity * 0.3);
      await db.insert(hotelAvailability).values({ hotelId: hotel.id, date: day, capacity: hotel.totalCapacity, booked });
    }
  }

  console.log("Creating demo bookings...");
  const demoBookingDefs = [
    { traveler: travelers[0], hotel: createdHotels[0], offset: 0, count: 2, status: "CONFIRMED" as const },
    { traveler: travelers[1], hotel: createdHotels[0], offset: -1, count: 1, status: "CHECKED_IN" as const },
    { traveler: travelers[2], hotel: createdHotels[1], offset: -2, count: 3, status: "CHECKED_OUT" as const },
    { traveler: travelers[3], hotel: createdHotels[2], offset: 1, count: 1, status: "CONFIRMED" as const },
    { traveler: travelers[0], hotel: createdHotels[2], offset: -3, count: 2, status: "CHECKED_OUT" as const },
    { traveler: travelers[1], hotel: createdHotels[4], offset: 0, count: 1, status: "CHECKED_IN" as const },
  ];

  for (const def of demoBookingDefs) {
    const dropOff = new Date(Date.now() + def.offset * 86400000).toISOString().slice(0, 10);
    const pickUp = new Date(Date.now() + (def.offset + 1) * 86400000).toISOString().slice(0, 10);
    const bookingCode = generateBookingCode();
    const qrCodeDataUrl = await generateQrDataUrl(JSON.stringify({ code: bookingCode, hotelId: def.hotel.id }));
    const totalPrice = computePrice({
      pricePerHour: def.hotel.pricePerHour,
      dropOffDate: dropOff,
      dropOffTime: "10:00",
      pickUpDate: pickUp,
      pickUpTime: "18:00",
      luggageCount: def.count,
    });

    await db.insert(bookings)
      .values({
        bookingCode,
        travelerId: def.traveler.id,
        hotelId: def.hotel.id,
        dropOffDate: new Date(dropOff),
        dropOffTime: "10:00",
        pickUpDate: new Date(pickUp),
        pickUpTime: "18:00",
        luggageCount: def.count,
        luggageNotes: "2 suitcases, 1 backpack",
        status: def.status,
        totalPrice,
        currency: "INR",
        qrCodeDataUrl,
        checkedInAt: def.status !== "CONFIRMED" ? new Date() : null,
        checkedOutAt: def.status === "CHECKED_OUT" ? new Date() : null,
      });
  }

  console.log("\nSeed complete. Demo accounts (all passwords: password123):");
  console.log(`  Admin:    ${admin.email}`);
  partners.forEach((p) => console.log(`  Partner:  ${p.email}`));
  travelers.forEach((t) => console.log(`  Traveler: ${t.email}`));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
