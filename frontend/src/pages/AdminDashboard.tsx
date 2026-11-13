import * as React from "react";
import { Users, Building2, PackageCheck, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

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

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<any>(null);
  const [users, setUsers] = React.useState<any[]>([]);
  const [hotels, setHotels] = React.useState<any[]>([]);
  const [bookings, setBookings] = React.useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      const [s, u, h, b] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/hotels"),
        api.get("/admin/bookings"),
      ]);
      setStats(s.data);
      setUsers(u.data.users);
      setHotels(h.data.hotels);
      setBookings(b.data.bookings);
    })();
  }, []);

  if (!stats) return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <p className="text-muted-foreground">Platform-wide overview of LuggageStay.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Users} label="Travelers" value={stats.travelers} />
        <StatCard icon={Building2} label="Hotel partners" value={stats.partners} />
        <StatCard icon={PackageCheck} label="Bookings" value={stats.bookings} />
        <StatCard icon={Wallet} label="Total revenue" value={formatCurrency(stats.totalRevenue)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <Badge key={status} variant="outline">
            {status}: {count as number}
          </Badge>
        ))}
      </div>

      <Tabs defaultValue="bookings" className="mt-8">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Traveler</th>
                    <th className="p-3">Hotel</th>
                    <th className="p-3">Drop-off</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-mono">{b.bookingCode}</td>
                      <td className="p-3">{b.traveler?.name}</td>
                      <td className="p-3">{b.hotel?.name} <span className="text-muted-foreground">· {b.hotel?.city}</span></td>
                      <td className="p-3">{formatDate(b.dropOffDate)}</td>
                      <td className="p-3"><StatusBadge status={b.status} /></td>
                      <td className="p-3 text-right font-medium">{formatCurrency(b.totalPrice, b.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hotels">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Hotel</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Rating</th>
                    <th className="p-3">Capacity</th>
                    <th className="p-3 text-right">Price / hr</th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.map((h) => (
                    <tr key={h.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-medium">{h.name}</td>
                      <td className="p-3">{h.owner?.name}</td>
                      <td className="p-3">{h.city}</td>
                      <td className="p-3">{h.rating.toFixed(1)}</td>
                      <td className="p-3">{h.totalCapacity}</td>
                      <td className="p-3 text-right">{formatCurrency(h.pricePerHour)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-medium">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3"><Badge variant="secondary">{u.role}</Badge></td>
                      <td className="p-3">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
