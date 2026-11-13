import QRCode from "qrcode";

/** Generates a short, human-friendly unique booking code, e.g. "LS-7F3K9A". */
export function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (I,O,0,1)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `LS-${code}`;
}

/** Produces a data: URL PNG QR code encoding the booking's verification payload. */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { margin: 1, width: 300 });
}

/** Computes total price given price/hour/bag, drop-off/pick-up date+time, and bag count. */
export function computePrice(opts: {
  pricePerHour: number;
  dropOffDate: string;
  dropOffTime: string;
  pickUpDate: string;
  pickUpTime: string;
  luggageCount: number;
}): number {
  const start = new Date(`${opts.dropOffDate}T${opts.dropOffTime}:00`);
  const end = new Date(`${opts.pickUpDate}T${opts.pickUpTime}:00`);
  let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (!Number.isFinite(hours) || hours <= 0) hours = 1;
  hours = Math.max(1, Math.ceil(hours));
  const raw = hours * opts.pricePerHour * opts.luggageCount;
  return Math.round(raw * 100) / 100;
}

/** Normalizes a date string (YYYY-MM-DD) to a UTC-midnight Date — the availability row key. */
export function toDayKey(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Returns an array of UTC-midnight day keys from start to end inclusive. */
export function dayRange(startStr: string, endStr: string): Date[] {
  const start = toDayKey(startStr);
  const end = toDayKey(endStr);
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
