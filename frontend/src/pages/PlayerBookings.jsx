import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import PlayerLayout from "../components/PlayerLayout";
import EmptyState from "../components/EmptyState";

const todayString = () => new Date().toISOString().slice(0, 10);

// Group consecutive same-court, same-day slots into sessions (time range + total duration)
function buildSessionsFromCourtBookings(courtBookings, isUpcomingFn) {
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

export default function PlayerBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("upcoming"); // default: Upcoming (not All)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [expandedSessions, setExpandedSessions] = useState(new Set()); // "courtId-start_time" for session detail
  const [dateSearch, setDateSearch] = useState("");
  const [datePickerValue, setDatePickerValue] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null); // { courtId, startTime, anchorRect } or null
  const [cancelConfirm, setCancelConfirm] = useState(null); // { session, bookingsToCancel }
  const [bottomSheet, setBottomSheet] = useState(null); // { session, courtName } for mobile
  const [thisWeekOnly, setThisWeekOnly] = useState(false);
  const todayCardRef = useRef(null);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-expand today and upcoming dates on load; scroll to today
  useEffect(() => {
    if (bookings.length === 0) return;
    const today = todayString();
    const expanded = new Set();
    const grouped = groupBookingsByDate(bookings);
    Object.keys(grouped).forEach((dateStr) => {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);
      if (d >= todayDate) expanded.add(dateStr);
    });
    setExpandedDates(expanded);
    // Scroll and highlight today after a short delay
    const t = setTimeout(() => {
      const el = document.getElementById(`date-card-${today}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        todayCardRef.current = el;
      }
    }, 300);
    return () => clearTimeout(t);
  }, [bookings]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/player/bookings");
      // API Resources wrap in { data: [...] }
      setBookings(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err) {
      console.error(err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = async (bookingsToCancel) => {
    if (!cancelConfirm || !bookingsToCancel?.length) return;
    setCancelConfirm(null);

    try {
      setCancellingId(bookingsToCancel[0].id);
      await Promise.all(bookingsToCancel.map((b) => api.delete(`/bookings/${b.id}`)));
      toast.success(
        bookingsToCancel.length === 1
          ? "Booking cancelled successfully"
          : `${bookingsToCancel.length} bookings cancelled successfully`
      );
      await loadBookings();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeString) => {
    return timeString.slice(0, 5);
  };

  const isUpcoming = (booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate >= today && booking.status === "confirmed";
  };

  const isPast = (booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate < today || booking.status === "cancelled";
  };

  const isToday = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  // Status for a date group: Today | Upcoming | Past | Cancelled
  const getDateStatus = (dateBookings) => {
    const allCancelled = dateBookings.every((b) => b.status === "cancelled");
    if (allCancelled) return "cancelled";
    if (dateBookings.some((b) => isToday(b.date))) {
      const hasUpcoming = dateBookings.some(isUpcoming);
      return hasUpcoming ? "today" : "past";
    }
    return dateBookings.some(isUpcoming) ? "upcoming" : "past";
  };

  const groupBookingsByDate = (bookingsList) => {
    const grouped = {};
    bookingsList.forEach((booking) => {
      const dateKey = booking.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(booking);
    });
    return grouped;
  };

  const groupBookingsByCourt = (bookingsList) => {
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
    // Convert to array and sort by court name, then by first booking time
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
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (filter === "upcoming") return isUpcoming(booking);
      if (filter === "past") return isPast(booking);
      if (filter === "cancelled") return booking.status === "cancelled";
      return true; // 'all'
    });
  }, [bookings, filter]);

  const groupedBookings = useMemo(() => {
    const grouped = groupBookingsByDate(filteredBookings);
    
    // Sort dates chronologically (upcoming first, then past)
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      // If filtering upcoming, show future dates first
      if (filter === "upcoming") {
        return dateA - dateB;
      }
      // If filtering past, show recent past first
      if (filter === "past") {
        return dateB - dateA;
      }
      // For 'all', show upcoming first, then past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isAUpcoming = dateA >= today;
      const isBUpcoming = dateB >= today;
      
      if (isAUpcoming && !isBUpcoming) return -1;
      if (!isAUpcoming && isBUpcoming) return 1;
      
      // Both same category, sort by date
      return isAUpcoming ? dateA - dateB : dateB - dateA;
    });

    // Filter by date picker (exact date), This Week, or text search
    let filteredDates = sortedDates;
    if (datePickerValue) {
      filteredDates = sortedDates.filter((dateStr) => dateStr === datePickerValue);
    } else if (thisWeekOnly) {
      const today = new Date(todayString());
      today.setHours(0, 0, 0, 0);
      const endWeek = new Date(today);
      endWeek.setDate(endWeek.getDate() + 6);
      filteredDates = sortedDates.filter((dateStr) => {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d >= today && d <= endWeek;
      });
    } else if (dateSearch) {
      const searchLower = dateSearch.toLowerCase();
      filteredDates = sortedDates.filter(
        (dateStr) =>
          formatDateShort(dateStr).toLowerCase().includes(searchLower) ||
          formatDate(dateStr).toLowerCase().includes(searchLower)
      );
    }

    return filteredDates.map((dateStr) => {
      const dateBookings = grouped[dateStr].sort((a, b) => a.start_time.localeCompare(b.start_time));
      const courts = groupBookingsByCourt(grouped[dateStr]).map((courtGroup) => ({
        ...courtGroup,
        sessions: buildSessionsFromCourtBookings(courtGroup.bookings, isUpcoming),
      }));
      return {
        date: dateStr,
        bookings: dateBookings,
        courts,
        dateStatus: getDateStatus(dateBookings),
      };
    });
  }, [filteredBookings, filter, dateSearch, datePickerValue, thisWeekOnly]);

  const toggleDate = (dateStr) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateStr)) newExpanded.delete(dateStr);
    else newExpanded.add(dateStr);
    setExpandedDates(newExpanded);
  };

  const sessionKey = (courtId, startTime) => `${courtId}-${startTime}`;
  const toggleSession = (courtId, startTime) => {
    const key = sessionKey(courtId, startTime);
    const next = new Set(expandedSessions);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedSessions(next);
    setMenuOpen(null);
  };

  const jumpToToday = () => {
    const today = todayString();
    const todayGroup = groupedBookings.find((g) => g.date === today);
    const newExpanded = new Set(expandedDates);
    newExpanded.add(today);
    setExpandedDates(newExpanded);
    setDateSearch("");
    setDatePickerValue("");
    setThisWeekOnly(false);
    setTimeout(() => {
      const el = document.getElementById(`date-card-${today}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("my-bookings-today-highlight");
        setTimeout(() => el.classList.remove("my-bookings-today-highlight"), 2000);
      }
    }, 150);
    if (!todayGroup) setFilter("all");
  };

  const applyQuickFilter = (type) => {
    if (type === "today") {
      setDatePickerValue(todayString());
      setDateSearch("");
      const today = todayString();
      const newExpanded = new Set(expandedDates);
      newExpanded.add(today);
      setExpandedDates(newExpanded);
      setTimeout(() => {
        const el = document.getElementById(`date-card-${today}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    if (type === "thisWeek") {
      setDateSearch("");
      setDatePickerValue("");
      setThisWeekOnly(true);
      setFilter("upcoming");
    }
  };

  const upcomingCount = bookings.filter(isUpcoming).length;
  const pastCount = bookings.filter(isPast).length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;

  return (
    <PlayerLayout>
      {/* Page Header */}
      <div style={{ marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          My Bookings
        </h1>
        <p style={{ color: "#6b7280", fontSize: isMobile ? "0.9rem" : "1rem" }}>
          View and manage all your court bookings
        </p>
      </div>

      {/* Filter Tabs — default Upcoming, All secondary */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid #e5e7eb",
          flexWrap: "wrap",
          overflowX: isMobile ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[
          { key: "upcoming", label: "Upcoming", count: upcomingCount },
          { key: "past", label: "Past", count: pastCount },
          { key: "cancelled", label: "Cancelled", count: cancelledCount },
          { key: "all", label: "All", count: bookings.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: isMobile ? "0.5rem 1rem" : "0.75rem 1.25rem",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: filter === tab.key ? "2px solid #2563eb" : "2px solid transparent",
              color: filter === tab.key ? "#2563eb" : "#6b7280",
              fontWeight: filter === tab.key ? 600 : 500,
              cursor: "pointer",
              fontSize: isMobile ? "0.85rem" : "0.95rem",
              marginBottom: "-1px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  padding: "0.15rem 0.5rem",
                  backgroundColor: filter === tab.key ? "#dbeafe" : "#f3f4f6",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & quick filters: date picker, Today, This Week, Jump to Today */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="date"
          value={datePickerValue}
          onChange={(e) => {
            const v = e.target.value;
            setDatePickerValue(v);
            setThisWeekOnly(false);
            if (v) {
              const d = new Date(v);
              setDateSearch(d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }));
            } else setDateSearch("");
          }}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            fontSize: isMobile ? "0.85rem" : "0.9rem",
            minWidth: isMobile ? "130px" : "150px",
          }}
        />
        <button
          type="button"
          onClick={() => applyQuickFilter("today")}
          style={{
            padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1rem",
            backgroundColor: "#f3f4f6",
            color: "#374151",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: isMobile ? "0.85rem" : "0.9rem",
            whiteSpace: "nowrap",
          }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => applyQuickFilter("thisWeek")}
          style={{
            padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1rem",
            backgroundColor: thisWeekOnly ? "#dbeafe" : "#f3f4f6",
            color: thisWeekOnly ? "#1e40af" : "#374151",
            border: `1px solid ${thisWeekOnly ? "#93c5fd" : "#e5e7eb"}`,
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: isMobile ? "0.85rem" : "0.9rem",
            whiteSpace: "nowrap",
          }}
        >
          This Week
        </button>
        <button
          type="button"
          onClick={jumpToToday}
          style={{
            padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1rem",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: isMobile ? "0.85rem" : "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            whiteSpace: "nowrap",
          }}
        >
          <span aria-hidden>📅</span>
          {!isMobile && "Jump to Today"}
        </button>
        <input
          type="text"
          placeholder="Search by date..."
          value={dateSearch}
          onChange={(e) => {
            setDateSearch(e.target.value);
            setThisWeekOnly(false);
          }}
          style={{
            flex: 1,
            minWidth: isMobile ? "120px" : "180px",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            fontSize: isMobile ? "0.85rem" : "0.9rem",
          }}
        />
        {(dateSearch || datePickerValue || thisWeekOnly) && (
          <button
            type="button"
            onClick={() => { setDateSearch(""); setDatePickerValue(""); setThisWeekOnly(false); }}
            style={{
              padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1rem",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: isMobile ? "0.85rem" : "0.9rem",
              whiteSpace: "nowrap",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.5rem",
            color: "#b91c1c",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
          Loading bookings...
        </div>
      ) : groupedBookings.length === 0 ? (
        <EmptyState
          title={
            dateSearch
              ? "No bookings for this date"
              : filter === "upcoming"
              ? "No upcoming bookings"
              : filter === "past"
              ? "No past bookings"
              : filter === "cancelled"
              ? "No cancelled bookings"
              : "No bookings yet"
          }
          message={
            dateSearch
              ? "Try a different date or clear the search."
              : filter === "upcoming"
              ? "Book a court to see your upcoming bookings here."
              : filter === "past"
              ? "Past bookings will appear here."
              : filter === "cancelled"
              ? "Cancelled bookings will appear here."
              : "Your bookings will show here once you book a court."
          }
          actionLabel={(filter === "upcoming" || filter === "all") && !dateSearch ? "Book a Court" : undefined}
          actionTo={(filter === "upcoming" || filter === "all") && !dateSearch ? "/player/book" : undefined}
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {groupedBookings.map(({ date, bookings: dateBookings, courts, dateStatus }) => {
            const isExpanded = expandedDates.has(date);
            const isDateToday = isToday(date);
            const statusConfig = {
              today: { label: "Today", bg: "#dbeafe", color: "#1e40af" },
              upcoming: { label: "Upcoming", bg: "#dcfce7", color: "#166534" },
              past: { label: "Past", bg: "#f3f4f6", color: "#6b7280" },
              cancelled: { label: "Cancelled", bg: "#fee2e2", color: "#991b1b" },
            };
            const status = statusConfig[dateStatus] || statusConfig.past;

            return (
              <div
                key={date}
                id={`date-card-${date}`}
                ref={isDateToday ? todayCardRef : undefined}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "0.75rem",
                  border: `1px solid ${isDateToday ? "#93c5fd" : "#e5e7eb"}`,
                  boxShadow: isDateToday ? "0 2px 8px rgba(37, 99, 235, 0.12)" : "0 1px 2px rgba(0,0,0,0.05)",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleDate(date)}
                  style={{
                    width: "100%",
                    padding: isMobile ? "1rem" : "1rem 1.25rem",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textAlign: "left",
                    minHeight: isMobile ? 48 : 56,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, flexWrap: "wrap" }}>
                    <div style={{ fontSize: isMobile ? "1.05rem" : "1.2rem", fontWeight: 600, color: "#111827" }}>
                      {formatDateShort(date)}
                    </div>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        backgroundColor: status.bg,
                        color: status.color,
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {status.label}
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {dateBookings.length} {dateBookings.length === 1 ? "booking" : "bookings"} · {status.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "1rem",
                      color: "#9ca3af",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                    aria-hidden
                  >
                    ▼
                  </span>
                </button>

                {isExpanded && (
                  <div
                    style={{
                      padding: isMobile ? "0 1rem 1rem" : "0 1.25rem 1.25rem",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {courts?.map((courtGroup) => (
                        <div key={courtGroup.courtId} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          <div style={{ fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                            {courtGroup.courtName}
                          </div>
                          {(courtGroup.sessions || []).map((session) => {
                            const key = sessionKey(courtGroup.courtId, session.start_time);
                            const isSessionExpanded = expandedSessions.has(key);
                            const timeRange = `${formatTime(session.start_time)}–${formatTime(session.end_time)}`;
                            const hrsLabel = session.durationHrs === 1 ? "1 hr" : `${session.durationHrs} hrs`;
                            const cancellable = session.hasUpcoming && !session.allCancelled;
                            const menuIsOpen =
                              menuOpen?.courtId === courtGroup.courtId && menuOpen?.startTime === session.start_time;

                            return (
                              <div
                                key={key}
                                style={{
                                  backgroundColor: "#f9fafb",
                                  borderRadius: "0.5rem",
                                  border: "1px solid #e5e7eb",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: isMobile ? "0.75rem 1rem" : "0.875rem 1rem",
                                    gap: "0.5rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>
                                      {timeRange}
                                    </span>
                                    <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>({hrsLabel})</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                    <button
                                      type="button"
                                      onClick={() => toggleSession(courtGroup.courtId, session.start_time)}
                                      style={{
                                        padding: isMobile ? "0.5rem 0.75rem" : "0.4rem 0.6rem",
                                        minHeight: isMobile ? 44 : 36,
                                        fontSize: "0.8rem",
                                        color: "#6b7280",
                                        backgroundColor: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        borderRadius: "0.25rem",
                                      }}
                                    >
                                      {isSessionExpanded ? "Hide details" : "View details"}
                                    </button>
                                    {cancellable && (
                                      <div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            if (menuIsOpen) {
                                              setMenuOpen(null);
                                            } else {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setMenuOpen({
                                                courtId: courtGroup.courtId,
                                                startTime: session.start_time,
                                                courtName: courtGroup.courtName,
                                                session,
                                                anchorRect: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left },
                                              });
                                            }
                                          }}
                                          style={{
                                            padding: isMobile ? "0.5rem 0.75rem" : "0.4rem 0.6rem",
                                            minWidth: isMobile ? 44 : 36,
                                            minHeight: isMobile ? 44 : 36,
                                            fontSize: "1.1rem",
                                            color: "#6b7280",
                                            backgroundColor: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            borderRadius: "0.25rem",
                                          }}
                                          aria-label="Manage booking"
                                        >
                                          ⋯
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {isSessionExpanded && (
                                  <div
                                    style={{
                                      borderTop: "1px solid #e5e7eb",
                                      padding: "0.75rem 1rem",
                                      backgroundColor: "#fff",
                                    }}
                                  >
                                    <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                                      Individual slots
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem", color: "#374151" }}>
                                      {session.bookings.map((b) => (
                                        <li key={b.id} style={{ marginBottom: "0.25rem" }}>
                                          {formatTime(b.start_time)} – {formatTime(b.end_time)}
                                          {b.id && (
                                            <span style={{ marginLeft: "0.5rem", color: "#9ca3af", fontFamily: "monospace" }}>
                                              #{b.id}
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Session menu: render in portal so it appears above overlay and isn't clipped */}
      {menuOpen &&
        createPortal(
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 9998 }}
              onClick={() => setMenuOpen(null)}
              aria-hidden
            />
            <div
              style={{
                position: "fixed",
                top: menuOpen.anchorRect.bottom + 4,
                right: Math.max(8, window.innerWidth - menuOpen.anchorRect.right),
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 9999,
                minWidth: 160,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (isMobile) {
                    setBottomSheet({ session: menuOpen.session, courtName: menuOpen.courtName });
                    setMenuOpen(null);
                  } else {
                    toggleSession(menuOpen.courtId, menuOpen.startTime);
                    setMenuOpen(null);
                  }
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.6rem 1rem",
                  textAlign: "left",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  color: "#374151",
                }}
              >
                Manage booking
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancelConfirm({
                    session: menuOpen.session,
                    courtName: menuOpen.courtName,
                    bookingsToCancel: menuOpen.session.bookings.filter(
                      (b) => isUpcoming(b) && b.status !== "cancelled"
                    ),
                  });
                  setMenuOpen(null);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.6rem 1rem",
                  textAlign: "left",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  color: "#b91c1c",
                }}
              >
                Cancel booking
              </button>
            </div>
          </>,
          document.body
        )}

      {/* Cancel confirmation dialog — clarify refund / cancellation eligibility */}
      {cancelConfirm && cancelConfirm.bookingsToCancel?.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: isMobile ? "1rem" : undefined,
          }}
          onClick={() => setCancelConfirm(null)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "0.75rem",
              padding: isMobile ? "1.25rem" : "1.5rem",
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.15rem", fontWeight: 600, color: "#111827", marginBottom: "0.75rem" }}>
              Cancel booking?
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#6b7280", marginBottom: "0.75rem" }}>
              {cancelConfirm.courtName} · {cancelConfirm.bookingsToCancel.length}{" "}
              {cancelConfirm.bookingsToCancel.length === 1 ? "slot" : "slots"}
            </p>
            <div
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "0.5rem",
                fontSize: "0.85rem",
                color: "#92400e",
                marginBottom: "1rem",
              }}
            >
              <strong>Cancellation policy:</strong> Reservation or full payment is non-refundable. Cancelling will free the
              slot for others.
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setCancelConfirm(null)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={() => handleCancelSession(cancelConfirm.bookingsToCancel)}
                disabled={cancellingId !== null}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#b91c1c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: cancellingId ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  opacity: cancellingId ? 0.7 : 1,
                }}
              >
                {cancellingId ? "Cancelling…" : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom sheet: booking details & actions */}
      {isMobile && bottomSheet && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setBottomSheet(null)}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: "1rem",
              borderTopRightRadius: "1rem",
              padding: "1.25rem",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
              width: "100%",
              maxHeight: "70vh",
              overflowY: "auto",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", marginBottom: "0.5rem" }}>
              {bottomSheet.courtName}
            </div>
            <div style={{ fontSize: "0.9rem", color: "#6b7280", marginBottom: "1rem" }}>
              {formatTime(bottomSheet.session.start_time)}–{formatTime(bottomSheet.session.end_time)} (
              {bottomSheet.session.durationHrs === 1 ? "1 hr" : `${bottomSheet.session.durationHrs} hrs`})
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>Reference IDs</div>
            <ul style={{ margin: "0 0 1rem", paddingLeft: "1.25rem", fontSize: "0.9rem", color: "#374151" }}>
              {bottomSheet.session.bookings.map((b) => (
                <li key={b.id} style={{ marginBottom: "0.25rem" }}>
                  #{b.id}
                </li>
              ))}
            </ul>
            {bottomSheet.session.hasUpcoming && !bottomSheet.session.allCancelled && (
              <button
                type="button"
                onClick={() => {
                  setCancelConfirm({
                    session: bottomSheet.session,
                    courtName: bottomSheet.courtName,
                    bookingsToCancel: bottomSheet.session.bookings.filter(
                      (b) => isUpcoming(b) && b.status !== "cancelled"
                    ),
                  });
                  setBottomSheet(null);
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                Cancel booking
              </button>
            )}
            <button
              type="button"
              onClick={() => setBottomSheet(null)}
              style={{
                width: "100%",
                marginTop: "0.75rem",
                padding: "0.75rem 1rem",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </PlayerLayout>
  );
}
