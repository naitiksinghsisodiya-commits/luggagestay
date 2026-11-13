import * as React from "react";
import { PackageCheck, PackageOpen, Wallet, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api, extractErrorMessage } from "@/api/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import type { Booking, Hotel, AvailabilityDay } from "@/types";

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function HotelSetupForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    address: "",
    city: "",
    pricePerHour: "20",
    totalCapacity: "30",
    amenities: "24/7 access, CCTV monitored",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/partner/hotel", {
        ...form,
        pricePerHour: Number(form.pricePerHour),
        totalCapacity: Number(form.totalCapacity),
        amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean),
      });
      onCreated();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Set up your hotel's storage listing</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <Label>Hotel name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Address</Label>
                <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>Price per bag / hour (₹)</Label>
                <Input type="number" required value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })} />
              </div>
              <div>
                <Label>Total bag capacity</Label>
                <Input type="number" required value={form.totalCapacity} onChange={(e) => setForm({ ...form, totalCapacity: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Amenities (comma separated)</Label>
              <Input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create listing"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PartnerDashboard() {
  const [hotel, setHotel] = React.useState<Hotel | null | "none">(null);
  const [stats, setStats] = React.useState<any>(null);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [availability, setAvailability] = React.useState<AvailabilityDay[]>([]);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    try {
      const { data } = await api.get("/partner/hotel");
      setHotel(data.hotel);
      const [statsRes, bookingsRes, availRes] = await Promise.all([
        api.get("/partner/stats"),
        api.get("/partner/bookings"),
        api.get("/partner/availability"),
      ]);
      setStats(statsRes.data);
      setBookings(bookingsRes.data.bookings);
      setAvailability(availRes.data.availability);
    } catch {
      setHotel("none");
    }
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function updateCapacity(date: string, capacity: number) {
    setActionError(null);
    try {
      await api.post("/partner/availability", { date, capacity });
      const { data } = await api.get("/partner/availability");
      setAvailability(data.availability);
    } catch (err) {
      setActionError(extractErrorMessage(err));
    }
  }

  async function checkIn(id: string) {
    setActionError(null);
    try {
      await api.post(`/bookings/${id}/check-in`);
      loadAll();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    }
  }

  async function checkOut(id: string) {
    setActionError(null);
    try {
      await api.post(`/bookings/${id}/check-out`);
      loadAll();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    }
  }

  if (hotel === "none") return <HotelSetupForm onCreated={loadAll} />;
  if (!hotel || !stats) return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">Loading dashboard...</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">{hotel.name}</h1>
      <p className="text-muted-foreground">{hotel.address}, {hotel.city}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={ListChecks} label="Total bookings" value={stats.totalBookings} />
        <StatCard icon={PackageOpen} label="Awaiting drop-off" value={stats.awaitingDropOff} />
        <StatCard icon={PackageCheck} label="Currently stored" value={stats.currentlyStored} />
        <StatCard icon={Wallet} label="Total revenue" value={formatCurrency(stats.totalRevenue, hotel.currency)} />
      </div>

      {actionError && <p className="mt-4 text-sm text-destructive">{actionError}</p>}

      <Tabs defaultValue="bookings" className="mt-8">
        <TabsList>
          <TabsTrigger value="bookings">Bookings & check-in/out</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <div className="flex flex-col gap-3">
            {bookings.length === 0 && (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No bookings yet.</CardContent></Card>
            )}
            {bookings.map((b) => (
              <Card key={b.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold">{b.bookingCode}</p>
                    <p className="text-sm">{b.traveler?.name} · {b.traveler?.phone || b.traveler?.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(b.dropOffDate)} {b.dropOffTime} → {formatDate(b.pickUpDate)} {b.pickUpTime} · {b.luggageCount} bag(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={b.status} />
                    {b.status === "CONFIRMED" && (
                      <Button size="sm" onClick={() => checkIn(b.id)}>Check in</Button>
                    )}
                    {b.status === "CHECKED_IN" && (
                      <Button size="sm" variant="outline" onClick={() => checkOut(b.id)}>Check out</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader><CardTitle className="text-base">Next 14 days — edit daily bag capacity</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {availability.map((day) => (
                <div key={day.date} className="rounded-lg border border-border p-3">
                  <p className="text-xs font-medium">
                    {new Date(day.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{day.booked} booked / {day.free} free</p>
                  <Input
                    type="number"
                    className="mt-2 h-8"
                    defaultValue={day.capacity}
                    min={day.booked}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (val !== day.capacity) updateCapacity(day.date, val);
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
