import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { extractErrorMessage } from "@/api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "HOTEL_PARTNER") navigate("/partner");
      else if (user.role === "ADMIN") navigate("/admin");
      else navigate("/");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role: "traveler" | "partner" | "admin") {
    const map = {
      traveler: "aditi@traveler.demo",
      partner: "partner.taj@luggagestay.demo",
      admin: "admin@luggagestay.demo",
    };
    setEmail(map[role]);
    setPassword("password123");
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Log in to manage bookings or storage availability.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <div className="mt-5 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Try a demo account (password: password123)</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fillDemo("traveler")}>
                Traveler
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => fillDemo("partner")}>
                Hotel partner
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => fillDemo("admin")}>
                Admin
              </Button>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
