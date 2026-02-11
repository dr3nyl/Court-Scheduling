/**
 * Booking utility functions — pure helpers for date/time formatting and booking grouping.
 */

export const todayString = () => new Date().toISOString().slice(0, 10);

export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(timeString) {
  return timeString.slice(0, 5);
}

/**
 * Group consecutive same-court, same-day slots into sessions (time range + total duration)
 */
export function buildSessionsFromCourtBookings(courtBookings, isUpcomingFn) {
  if (!courtBookings?.length) return [];
  const sorted = [...courtBookings].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const sessions = [];
  let current = { start_time: sorted[0].start_time, end_time: sorted[0].end_time, bookings: [sorted[0]] };

  for (let i = 1; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.start_time === current.end_time && b.status !== "cancelled") {
      current.end_time = b.end_time;
      current.bookings.push(b);
    } else {
      const start = new Date(`2000-01-01 ${current.start_time}`);
      const end = new Date(`2000-01-01 ${current.end_time}`);
      const durationHrs = (end - start) / (1000 * 60 * 60);
      sessions.push({
        ...current,
        durationHrs,
        hasUpcoming: current.bookings.some(isUpcomingFn),
        allCancelled: current.bookings.every((x) => x.status === "cancelled"),
      });
      current = { start_time: b.start_time, end_time: b.end_time, bookings: [b] };
    }
  }
  const start = new Date(`2000-01-01 ${current.start_time}`);
  const end = new Date(`2000-01-01 ${current.end_time}`);
  const durationHrs = (end - start) / (1000 * 60 * 60);
  sessions.push({
    ...current,
    durationHrs,
    hasUpcoming: current.bookings.some(isUpcomingFn),
    allCancelled: current.bookings.every((x) => x.status === "cancelled"),
  });
  return sessions;
}

export function groupBookingsByDate(bookingsList) {
  const grouped = {};
  bookingsList.forEach((booking) => {
    const dateKey = booking.date;
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(booking);
  });
  return grouped;
}

export function groupBookingsByCourt(bookingsList) {
  const grouped = {};
  bookingsList.forEach((booking) => {
    const courtId = booking.court?.id || "unknown";
    const courtName = booking.court?.name || "Court";
    if (!grouped[courtId]) {
      grouped[courtId] = {
        courtId,
        courtName,
        bookings: [],
      };
    }
    grouped[courtId].bookings.push(booking);
  });
  return Object.values(grouped)
    .map((group) => ({
      ...group,
      bookings: group.bookings.sort((a, b) => a.start_time.localeCompare(b.start_time)),
    }))
    .sort((a, b) => {
      const nameCompare = a.courtName.localeCompare(b.courtName);
      if (nameCompare !== 0) return nameCompare;
      return a.bookings[0].start_time.localeCompare(b.bookings[0].start_time);
    });
}

export function isUpcoming(booking) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDate = new Date(booking.date);
  bookingDate.setHours(0, 0, 0, 0);
  return bookingDate >= today && booking.status === "confirmed";
}

export function isPast(booking) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDate = new Date(booking.date);
  bookingDate.setHours(0, 0, 0, 0);
  return bookingDate < today || booking.status === "cancelled";
}

export function isToday(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}

/**
 * Status for a date group: "today" | "upcoming" | "past" | "cancelled"
 */
export function getDateStatus(dateBookings) {
  const allCancelled = dateBookings.every((b) => b.status === "cancelled");
  if (allCancelled) return "cancelled";
  if (dateBookings.some((b) => isToday(b.date))) {
    const hasUpcoming = dateBookings.some(isUpcoming);
    return hasUpcoming ? "today" : "past";
  }
  return dateBookings.some(isUpcoming) ? "upcoming" : "past";
}
