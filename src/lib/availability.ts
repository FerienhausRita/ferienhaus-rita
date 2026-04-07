/**
 * Availability system - currently uses mock data.
 *
 * Replace with real database/API calls when ready.
 * Architecture supports:
 * - Database-backed availability
 * - iCal sync
 * - Channel manager integration
 */

interface BookedPeriod {
  apartmentId: string;
  checkIn: Date;
  checkOut: Date;
}

// Mock booked periods for demonstration
const bookedPeriods: BookedPeriod[] = [
  // Add mock bookings here when needed
];

export function isAvailable(
  apartmentId: string,
  checkIn: Date,
  checkOut: Date
): boolean {
  return !bookedPeriods.some(
    (booking) =>
      booking.apartmentId === apartmentId &&
      checkIn < booking.checkOut &&
      checkOut > booking.checkIn
  );
}

export function getUnavailableDates(
  apartmentId: string,
  month: Date
): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const unavailable: Date[] = [];

  bookedPeriods
    .filter((b) => b.apartmentId === apartmentId)
    .forEach((booking) => {
      const current = new Date(
        Math.max(start.getTime(), booking.checkIn.getTime())
      );
      const bookingEnd = new Date(
        Math.min(end.getTime(), booking.checkOut.getTime())
      );
      while (current <= bookingEnd) {
        unavailable.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });

  return unavailable;
}
