import { Link, useNavigate } from "react-router-dom";
import { Luggage, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
          <Luggage className="h-6 w-6" />
          <span className="text-lg">LuggageStay</span>
        </Link>

        <nav className="flex items-center gap-3">
          {!user && (
            <>
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Find storage
              </Link>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button size="sm" onClick={() => navigate("/register")}>
                Sign up
              </Button>
            </>
          )}

          {user?.role === "TRAVELER" && (
            <>
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Find storage
              </Link>
              <Link to="/my-bookings" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                My bookings
              </Link>
            </>
          )}

          {user?.role === "HOTEL_PARTNER" && (
            <Link to="/partner" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Partner dashboard
            </Link>
          )}

          {user?.role === "ADMIN" && (
            <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Admin dashboard
            </Link>
          )}

          {user && (
            <div className="ml-2 flex items-center gap-2 border-l border-border pl-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                {user.name.split(" ")[0]}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
