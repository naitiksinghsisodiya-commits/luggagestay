import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, MapPin, CheckCircle2, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api, extractErrorMessage } from "@/api/client";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import type { Hotel, AvailabilityDay } from "@/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function inDays(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

export default function HotelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [hotel, setHotel] = React.useState<Hotel | null>(null);
  const [availability, setAvailability] = React.useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [dropOffDate, setDropOffDate] = React.useState(todayStr());
  const [dropOffTime, setDropOffTime] = React.useState("10:00");
  const [pickUpDate, setPickUpDate] = React.useState(inDays(1));
  const [pickUpTime, setPickUpTime] = React.useState("18:00");
  const [luggageCount, setLuggageCount] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { data } = await api.get(`/hotels/${id}`);
      setHotel(data.hotel);
      setAvailability(data.availability);
      setLoading(false);
    })();
  }, [id]);

  const hours = React.useMemo(() => {
    const start = new Date(`${dropOffDate}T${dropOffTime}:00`);
    const end = new Date(`${pickUpDate}T${pickUpTime}:00`);
    const diff = (end.getTime() - start.getTime()) / 3600000;
    return Math.max(1, Math.ceil(diff));
  }, [dropOffDate, dropOffTime, pickUpDate, pickUpTime]);

  const estimatedTotal = hotel ? hours * hotel.pricePerHour * luggageCount : 0;

  async function onBook(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "TRAVELER") {
      setError("Only traveler accounts can make a booking.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/bookings", {
        hotelId: id,
        dropOffDate,
        dropOffTime,
        pickUpDate,
        pickUpTime,
        luggageCount,
        luggageNotes: notes || undefined,
      });
      navigate(`/bookings/${data.booking.id}/confirmation`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">Loading...</div>;
  if (!hotel) return <div className="mx-auto max-w-5xl px-4 py-16 text-center">Hotel not found.</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-xl">
            {hotel.images.slice(0, 2).map((img, i) => (
              <img key={i} src={img} alt={hotel.name} className="h-56 w-full object-cover" />
            ))}
          </div>

          <h1 className="mt-5 text-2xl font-bold">{hotel.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {hotel.address}, {hotel.city}
            </span>
            <span className="flex items-center gap-1 font-medium text-amber-600">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> {hotel.rating.toFixed(1)}
            </span>
          </div>

          <p className="mt-4 text-muted-foreground">{hotel.description}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {hotel.amenities.map((a) => (
              <Badge key={a} variant="secondary" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {a}
              </Badge>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Next 7 days availability</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-7 gap-2">
              {availability.slice(0, 7).map((day) => (
                <div key={day.date} className="rounded-lg border border-border p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(day.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${day.free > 5 ? "text-green-600" : day.free > 0 ? "text-amber-600" : "text-red-600"}`}>
                    {day.free}
                  </p>
                  <p className="text-[10px] text-muted-foreground">free</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>
                {formatCurrency(hotel.pricePerHour, hotel.currency)}{" "}
                <span className="text-sm font-normal text-muted-foreground">/ bag / hour</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onBook} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Drop-off date</Label>
                    <Input type="date" min={todayStr()} value={dropOffDate} required
                      onChange={(e) => setDropOffDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Drop-off time</Label>
                    <Input type="time" value={dropOffTime} required onChange={(e) => setDropOffTime(e.target.value)} />
                  </div>
                  <div>
                    <Label>Pick-up date</Label>
                    <Input type="date" min={dropOffDate} value={pickUpDate} required
                      onChange={(e) => setPickUpDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Pick-up time</Label>
                    <Input type="time" value={pickUpTime} required onChange={(e) => setPickUpTime(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label>Number of bags</Label>
                  <div className="mt-1 flex items-center gap-3">
                    <Button type="button" variant="outline" size="icon" onClick={() => setLuggageCount((c) => Math.max(1, c - 1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{luggageCount}</span>
                    <Button type="button" variant="outline" size="icon" onClick={() => setLuggageCount((c) => Math.min(20, c + 1))}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Notes for the storage staff (optional)</Label>
                  <Textarea
                    placeholder="e.g. 1 fragile item, 1 backpack"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Estimated total ({hours} hr{hours > 1 ? "s" : ""})</span>
                  <span className="text-xl font-bold">{formatCurrency(estimatedTotal, hotel.currency)}</span>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? "Booking..." : user ? "Confirm booking" : "Log in to book"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
