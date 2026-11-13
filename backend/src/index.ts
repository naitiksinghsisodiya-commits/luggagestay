import "dotenv/config";
import express from "express";
import cors from "cors";
import { runMigrations } from "./db/migrate";
import authRoutes from "./routes/auth";
import hotelRoutes from "./routes/hotels";
import bookingRoutes from "./routes/bookings";
import partnerRoutes from "./routes/partner";
import adminRoutes from "./routes/admin";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "luggagestay-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/admin", adminRoutes);

// Central error handler — keeps route handlers free of boilerplate try/catch
// for unexpected errors (validation errors are still handled inline).
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`LuggageStay backend listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
