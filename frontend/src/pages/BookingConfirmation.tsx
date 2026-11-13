import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, MapPin, Luggage } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Booking } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";

export default function BookingConfirmation() {
  const { id } = useParams();
  const [booking, setBooking] = React.useState<Booking | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await api.get(`/bookings/${id}`);
      setBooking(data.booking);
    })();
  }, [id]);

  if (!booking) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Booking confirmed!</h1>
        <p className="mt-1 text-muted-foreground">Show this QR code at check-in and check-out.</p>
      </div>

      <Card>
        <CardHeader className="items-center text-center">
          <CardTitle className="font-mono text-xl tracking-wider">{booking.bookingCode}</CardTitle>
          <StatusBadge status={booking.status} />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <img src={booking.qrCodeDataUrl} alt="Booking QR code" className="h-48 w-48 rounded-lg border border-border" />

          <div className="w-full space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">{booking.hotel?.name}</p>
                <p className="text-muted-foreground">{booking.hotel?.address}, {booking.hotel?.city}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Luggage className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">{booking.luggageCount} bag{booking.luggageCount > 1 ? "s" : ""}</p>
                {booking.luggageNotes && <p className="text-muted-foreground">{booking.luggageNotes}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3">
              <div>
                <p className="text-xs text-muted-foreground">Drop-off</p>
                <p className="font-medium">{formatDate(booking.dropOffDate)} · {booking.dropOffTime}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pick-up</p>
                <p className="font-medium">{formatDate(booking.pickUpDate)} · {booking.pickUpTime}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Total paid</span>
              <span className="text-lg font-bold">{formatCurrency(booking.totalPrice, booking.currency)}</span>
            </div>
            <Badge variant="secondary" className="w-full justify-center py-1.5">
              Demo payment — no real charge was made
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-center gap-3">
        <Button asChild variant="outline">
          <Link to="/my-bookings">View all bookings</Link>
        </Button>
        <Button asChild>
          <Link to="/">Book more storage</Link>
        </Button>
      </div>
    </div>
  );
}
