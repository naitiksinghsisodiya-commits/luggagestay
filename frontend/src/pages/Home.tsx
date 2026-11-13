import * as React from "react";
import { Link } from "react-router-dom";
import { Search, Star, MapPin, Wifi, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import { formatCurrency } from "@/lib/utils";
import type { Hotel } from "@/types";

export default function Home() {
  const [hotels, setHotels] = React.useState<Hotel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [city, setCity] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [minRating, setMinRating] = React.useState("");

  const search = React.useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (city) params.city = city;
    if (query) params.q = query;
    if (maxPrice) params.maxPrice = maxPrice;
    if (minRating) params.minRating = minRating;
    const { data } = await api.get("/hotels", { params });
    setHotels(data.results);
    setLoading(false);
  }, [city, query, maxPrice, minRating]);

  React.useEffect(() => {
    search();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-white px-4 py-14">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Store your luggage, explore freely</h1>
          <p className="mt-3 text-muted-foreground">
            Book secure, hourly luggage storage at trusted hotels near you — no reservation required.
          </p>

          <Card className="mt-8 text-left">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[2fr_2fr_1fr_1fr_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">City</label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="e.g. Patna"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Hotel or area</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search hotels"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Max ₹/hr</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Min rating</label>
                <Input
                  type="number"
                  step="0.1"
                  max={5}
                  placeholder="Any"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                />
              </div>
              <Button onClick={search}>Search</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{loading ? "Searching..." : `${hotels.length} storage locations found`}</h2>
        </div>

        {!loading && hotels.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hotels match your filters. Try widening your search.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <Link key={hotel.id} to={`/hotels/${hotel.id}`}>
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                  <img src={hotel.images[0]} alt={hotel.name} className="h-full w-full object-cover" />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{hotel.name}</h3>
                    <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {hotel.rating.toFixed(1)}
                    </div>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {hotel.city}, {hotel.country}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{hotel.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {hotel.amenities.slice(0, 2).map((a) => (
                      <Badge key={a} variant="secondary" className="flex items-center gap-1">
                        {a.toLowerCase().includes("wifi") ? <Wifi className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                        {a}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">per bag, per hour</span>
                    <span className="text-lg font-bold">{formatCurrency(hotel.pricePerHour, hotel.currency)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
