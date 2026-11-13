export type Role = "TRAVELER" | "HOTEL_PARTNER" | "ADMIN";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
}

export interface Hotel {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  images: string[];
  amenities: string[];
  rating: number;
  pricePerHour: number;
  currency: string;
  totalCapacity: number;
}

export interface AvailabilityDay {
  date: string;
  capacity: number;
  booked: number;
  free: number;
}

export interface Booking {
  id: string;
  bookingCode: string;
  travelerId: string;
  hotelId: string;
  dropOffDate: string;
  dropOffTime: string;
  pickUpDate: string;
  pickUpTime: string;
  luggageCount: number;
  luggageNotes?: string | null;
  status: BookingStatus;
  totalPrice: number;
  currency: string;
  qrCodeDataUrl: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  createdAt: string;
  hotel?: Hotel;
  traveler?: { id: string; name: string; email: string; phone?: string | null } | null;
}
