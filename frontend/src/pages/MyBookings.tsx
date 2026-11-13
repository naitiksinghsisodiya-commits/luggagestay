import * as React from "react";
import { Link } from "react-router-dom";
import { MapPin, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, extractErrorMessage } from "@/api/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import type { Booking } from "@/types";

export default function MyBookings() {
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    try {
      const { data } = await api.get("/bookings/mine");
      setBookings(data.bookings);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function cancel(id: string) {
    if (!confirm("Cancel this booking?")) return;
    await api.post(`/bookings/${id}/cancel`);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My bookings</h1>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}
      {!loading && bookings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            You haven't made any bookings yet.
            <div className="mt-4">
              <Button asChild>
                <Link to="/">Find storage</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {bookings.map((b) => (
          <Card key={b.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <img
                  src={b.hotel?.images[0]}
                  alt={b.hotel?.name}
                  className="h-16 w-20 shrink-0 rounded-lg object-cover"
                />
                <div>
                  <p className="font-semibold">{b.hotel?.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {b.hotel?.city}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(b.dropOffDate)} {b.dropOffTime} → {formatDate(b.pickUpDate)} {b.pickUpTime}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{b.bookingCode}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={b.status} />
                <span className="text-sm font-semibold">{formatCurrency(b.totalPrice, b.currency)}</span>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/bookings/${b.id}/confirmation`}>
                      <QrCode className="mr-1 h-3.5 w-3.5" /> View QR
                    </Link>
                  </Button>
                  {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancel(b.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
