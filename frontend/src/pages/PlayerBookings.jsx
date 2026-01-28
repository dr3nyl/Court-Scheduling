import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import PlayerLayout from "../components/PlayerLayout";

export default function PlayerBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all', 'upcoming', 'past', 'cancelled'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [dateSearch, setDateSearch] = useState("");

  useEffect(() => {
    loadBookings();
  }, []);

  // Auto-expand today and upcoming dates on load
  useEffect(() => {
    if (bookings.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expanded = new Set();
      
      const grouped = groupBookingsByDate(bookings);
      Object.keys(grouped).forEach((dateStr) => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        // Expand today and future dates
        if (date >= today) {
          expanded.add(dateStr);
        }
      });
      
      setExpandedDates(expanded);
    }
  }, [bookings]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/player/bookings");
      setBookings(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      setCancellingId(bookingId);
      await api.delete(`/bookings/${bookingId}`);
      await loadBookings(); // Refresh the list
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to cancel booking");
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

    // Filter by date search if provided
    const filteredDates = dateSearch
      ? sortedDates.filter((dateStr) => {
          const date = new Date(dateStr);
          const searchLower = dateSearch.toLowerCase();
          return (
            formatDateShort(dateStr).toLowerCase().includes(searchLower) ||
            formatDate(dateStr).toLowerCase().includes(searchLower)
          );
        })
      : sortedDates;

    return filteredDates.map((dateStr) => ({
      date: dateStr,
      bookings: grouped[dateStr].sort((a, b) => {
        // Sort bookings by time
        return a.start_time.localeCompare(b.start_time);
      }),
    }));
  }, [filteredBookings, filter, dateSearch]);

  const toggleDate = (dateStr) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateStr)) {
      newExpanded.delete(dateStr);
    } else {
      newExpanded.add(dateStr);
    }
    setExpandedDates(newExpanded);
  };

  const jumpToToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayGroup = groupedBookings.find((group) => group.date === today);
    
    if (todayGroup) {
      // Expand today's date
      const newExpanded = new Set(expandedDates);
      newExpanded.add(today);
      setExpandedDates(newExpanded);
      
      // Scroll to today's card
      setTimeout(() => {
        const element = document.getElementById(`date-card-${today}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      // If no bookings today, clear date search and show all
      setDateSearch("");
    }
  };

  const upcomingCount = bookings.filter(isUpcoming).length;
  const pastCount = bookings.filter(isPast).length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;

  return (
    <PlayerLayout>
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          My Bookings
        </h1>
        <p style={{ color: "#6b7280", fontSize: "1rem" }}>
          View and manage all your court bookings
        </p>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "2px solid #e5e7eb",
          flexWrap: "wrap",
        }}
      >
        {[
          { key: "all", label: "All", count: bookings.length },
          { key: "upcoming", label: "Upcoming", count: upcomingCount },
          { key: "past", label: "Past", count: pastCount },
          { key: "cancelled", label: "Cancelled", count: cancelledCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: filter === tab.key ? "2px solid #2563eb" : "2px solid transparent",
              color: filter === tab.key ? "#2563eb" : "#6b7280",
              fontWeight: filter === tab.key ? 600 : 500,
              cursor: "pointer",
              fontSize: "0.95rem",
              marginBottom: "-2px",
              position: "relative",
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

      {/* Quick Navigation Bar */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          onClick={jumpToToday}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>📅</span>
          Jump to Today
        </button>
        <input
          type="text"
          placeholder="Search by date..."
          value={dateSearch}
          onChange={(e) => setDateSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            fontSize: "0.9rem",
          }}
        />
        {dateSearch && (
          <button
            onClick={() => setDateSearch("")}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.9rem",
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
        <div
          style={{
            padding: "3rem",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#6b7280", marginBottom: "1rem", fontSize: "1.1rem" }}>
            {dateSearch
              ? "No bookings found for this date"
              : filter === "upcoming"
              ? "No upcoming bookings"
              : filter === "past"
              ? "No past bookings"
              : filter === "cancelled"
              ? "No cancelled bookings"
              : "No bookings yet"}
          </p>
          {filter === "upcoming" && (
            <Link
              to="/player/book"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                borderRadius: "0.5rem",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Book a Court
            </Link>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {groupedBookings.map(({ date, bookings: dateBookings }) => {
            const isExpanded = expandedDates.has(date);
            const isDateUpcoming = dateBookings.some(isUpcoming);
            const isDateToday = isToday(date);
            const isDatePast = !isDateUpcoming && !isDateToday;

            return (
              <div
                key={date}
                id={`date-card-${date}`}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "0.75rem",
                  border: `2px solid ${
                    isDateToday
                      ? "#2563eb"
                      : isDateUpcoming
                      ? "#dcfce7"
                      : "#e5e7eb"
                  }`,
                  boxShadow: isDateToday
                    ? "0 4px 6px rgba(37, 99, 235, 0.1)"
                    : "0 1px 3px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Date Header - Clickable */}
                <button
                  onClick={() => toggleDate(date)}
                  style={{
                    width: "100%",
                    padding: "1.25rem 1.5rem",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {formatDateShort(date)}
                    </div>
                    {isDateToday && (
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#dbeafe",
                          color: "#1e40af",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        Today
                      </span>
                    )}
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: isDateUpcoming ? "#dcfce7" : "#f3f4f6",
                        color: isDateUpcoming ? "#166534" : "#6b7280",
                        borderRadius: "999px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      {dateBookings.length} {dateBookings.length === 1 ? "booking" : "bookings"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      color: "#6b7280",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    ▼
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "0 1.5rem 1.5rem 1.5rem",
                      borderTop: "1px solid #e5e7eb",
                      marginTop: "0.5rem",
                      paddingTop: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      {dateBookings.map((booking) => {
                        const isUpcomingBooking = isUpcoming(booking);
                        const isCancelled = booking.status === "cancelled";

                        return (
                          <div
                            key={booking.id}
                            style={{
                              padding: "1rem",
                              backgroundColor: "#f9fafb",
                              borderRadius: "0.5rem",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                flexWrap: "wrap",
                                gap: "1rem",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    marginBottom: "0.5rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <h3
                                    style={{
                                      fontSize: "1.1rem",
                                      fontWeight: 600,
                                      color: "#111827",
                                      margin: 0,
                                    }}
                                  >
                                    {booking.court?.name || "Court"}
                                  </h3>
                                  <span
                                    style={{
                                      padding: "0.25rem 0.75rem",
                                      backgroundColor: isCancelled
                                        ? "#fee2e2"
                                        : isUpcomingBooking
                                        ? "#dcfce7"
                                        : "#f3f4f6",
                                      color: isCancelled
                                        ? "#991b1b"
                                        : isUpcomingBooking
                                        ? "#166534"
                                        : "#374151",
                                      borderRadius: "999px",
                                      fontSize: "0.8rem",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {isCancelled
                                      ? "Cancelled"
                                      : isUpcomingBooking
                                      ? "Confirmed"
                                      : "Past"}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    color: "#6b7280",
                                    fontSize: "0.9rem",
                                    display: "flex",
                                    gap: "1rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span>
                                    <strong>Time:</strong> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                  </span>
                                </div>
                              </div>
                              {isUpcomingBooking && !isCancelled && (
                                <button
                                  onClick={() => handleCancel(booking.id)}
                                  disabled={cancellingId === booking.id}
                                  style={{
                                    padding: "0.5rem 1rem",
                                    backgroundColor: "#fee2e2",
                                    color: "#991b1b",
                                    border: "1px solid #fecaca",
                                    borderRadius: "0.5rem",
                                    cursor: cancellingId === booking.id ? "not-allowed" : "pointer",
                                    fontWeight: 500,
                                    fontSize: "0.85rem",
                                    opacity: cancellingId === booking.id ? 0.6 : 1,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {cancellingId === booking.id ? "Cancelling..." : "Cancel"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PlayerLayout>
  );
}
