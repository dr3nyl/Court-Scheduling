import { useState, useEffect, useMemo } from "react";
// import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import PlayerLayout from "../components/PlayerLayout";
import EmptyState from "../components/EmptyState";

export default function PlayerBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all', 'upcoming', 'past', 'cancelled'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [dateSearch, setDateSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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
      // API Resources wrap in { data: [...] }
      setBookings(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
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
      toast.success("Booking cancelled successfully");
      await loadBookings(); // Refresh the list
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

    // Filter by date search if provided
    const filteredDates = dateSearch
      ? sortedDates.filter((dateStr) => {
          // const date = new Date(dateStr);
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
      courts: groupBookingsByCourt(grouped[dateStr]),
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
      <div style={{ marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          My Bookings
        </h1>
        <p style={{ color: "#6b7280", fontSize: isMobile ? "0.9rem" : "1rem" }}>
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
          overflowX: isMobile ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
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
              padding: isMobile ? "0.5rem 1rem" : "0.75rem 1.5rem",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: filter === tab.key ? "2px solid #2563eb" : "2px solid transparent",
              color: filter === tab.key ? "#2563eb" : "#6b7280",
              fontWeight: filter === tab.key ? 600 : 500,
              cursor: "pointer",
              fontSize: isMobile ? "0.85rem" : "0.95rem",
              marginBottom: "-2px",
              position: "relative",
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
          <span>📅</span>
          {!isMobile && "Jump to Today"}
        </button>
        <input
          type="text"
          placeholder="Search by date..."
          value={dateSearch}
          onChange={(e) => setDateSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: isMobile ? "140px" : "200px",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            fontSize: isMobile ? "0.85rem" : "0.9rem",
          }}
        />
        {dateSearch && (
          <button
            onClick={() => setDateSearch("")}
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
          {groupedBookings.map(({ date, bookings: dateBookings, courts }) => {
            const isExpanded = expandedDates.has(date);
            const isDateUpcoming = dateBookings.some(isUpcoming);
            const isDateToday = isToday(date);
            // const isDatePast = !isDateUpcoming && !isDateToday;

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
                    padding: isMobile ? "1rem" : "1.25rem 1.5rem",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "0.5rem" : "1rem", flex: 1, flexWrap: "wrap" }}>
                    <div
                      style={{
                        fontSize: isMobile ? "1.1rem" : "1.5rem",
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
                        fontSize: isMobile ? "0.8rem" : "0.85rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
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
                      padding: isMobile ? "0 1rem 1rem 1rem" : "0 1.5rem 1.5rem 1.5rem",
                      borderTop: "1px solid #e5e7eb",
                      marginTop: "0.5rem",
                      paddingTop: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      {courts?.map((courtGroup) => {
                        const courtBookings = courtGroup.bookings;
                        // const hasUpcoming = courtBookings.some(isUpcoming);
                        const hasCancelled = courtBookings.some((b) => b.status === "cancelled");
                        const allCancelled = courtBookings.every((b) => b.status === "cancelled");

                        return (
                          <div
                            key={courtGroup.courtId}
                            style={{
                              padding: isMobile ? "0.75rem" : "1rem",
                              backgroundColor: "#f9fafb",
                              borderRadius: "0.5rem",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            {/* Court Header */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                marginBottom: "0.75rem",
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
                                {courtGroup.courtName}
                              </h3>
                              {hasCancelled && !allCancelled && (
                                <span
                                  style={{
                                    padding: "0.25rem 0.75rem",
                                    backgroundColor: "#fee2e2",
                                    color: "#991b1b",
                                    borderRadius: "999px",
                                    fontSize: "0.8rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  Some Cancelled
                                </span>
                              )}
                              {allCancelled && (
                                <span
                                  style={{
                                    padding: "0.25rem 0.75rem",
                                    backgroundColor: "#fee2e2",
                                    color: "#991b1b",
                                    borderRadius: "999px",
                                    fontSize: "0.8rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  All Cancelled
                                </span>
                              )}
                            </div>

                            {/* Time Slots - Compact Display */}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                              }}
                            >
                              {/* Group time slots by status for better display */}
                              {(() => {
                                const upcomingSlots = courtBookings.filter(
                                  (b) => isUpcoming(b) && b.status !== "cancelled"
                                );
                                const cancelledSlots = courtBookings.filter((b) => b.status === "cancelled");
                                const pastSlots = courtBookings.filter(
                                  (b) => !isUpcoming(b) && b.status !== "cancelled"
                                );

                                return (
                                  <>
                                    {upcomingSlots.length > 0 && (
                                      <div>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: "0.5rem",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: "0.85rem",
                                              color: "#6b7280",
                                              fontWeight: 500,
                                              marginRight: "0.25rem",
                                            }}
                                          >
                                            {isMobile ? "Times:" : "Reserved time slots:"}
                                          </span>
                                          {upcomingSlots.map((booking, idx) => (
                                            <div
                                              key={booking.id}
                                              style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontSize: "0.9rem",
                                                  color: "#111827",
                                                  fontWeight: 500,
                                                }}
                                              >
                                                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                              </span>
                                              {isUpcoming(booking) && booking.status !== "cancelled" && (
                                                <button
                                                  onClick={() => handleCancel(booking.id)}
                                                  disabled={cancellingId === booking.id}
                                                  style={{
                                                    padding: "0.25rem 0.5rem",
                                                    backgroundColor: "#fee2e2",
                                                    color: "#991b1b",
                                                    border: "1px solid #fecaca",
                                                    borderRadius: "0.25rem",
                                                    cursor: cancellingId === booking.id ? "not-allowed" : "pointer",
                                                    fontWeight: 500,
                                                    fontSize: "0.75rem",
                                                    opacity: cancellingId === booking.id ? 0.6 : 1,
                                                    whiteSpace: "nowrap",
                                                  }}
                                                  title="Cancel this booking"
                                                >
                                                  {cancellingId === booking.id ? "..." : "✕"}
                                                </button>
                                              )}
                                              {idx < upcomingSlots.length - 1 && (
                                                <span style={{ color: "#d1d5db" }}>•</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {cancelledSlots.length > 0 && (
                                      <div>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: "0.5rem",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: "0.85rem",
                                              color: "#9ca3af",
                                              textDecoration: "line-through",
                                              marginRight: "0.25rem",
                                            }}
                                          >
                                            Cancelled:
                                          </span>
                                          {cancelledSlots.map((booking, idx) => (
                                            <span
                                              key={booking.id}
                                              style={{
                                                fontSize: "0.9rem",
                                                color: "#9ca3af",
                                                textDecoration: "line-through",
                                              }}
                                            >
                                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                              {idx < cancelledSlots.length - 1 && (
                                                <span style={{ color: "#d1d5db", marginLeft: "0.5rem" }}>•</span>
                                              )}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {pastSlots.length > 0 && (
                                      <div>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: "0.5rem",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: "0.85rem",
                                              color: "#9ca3af",
                                              marginRight: "0.25rem",
                                            }}
                                          >
                                            Past:
                                          </span>
                                          {pastSlots.map((booking, idx) => (
                                            <span
                                              key={booking.id}
                                              style={{
                                                fontSize: "0.9rem",
                                                color: "#9ca3af",
                                              }}
                                            >
                                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                              {idx < pastSlots.length - 1 && (
                                                <span style={{ color: "#d1d5db", marginLeft: "0.5rem" }}>•</span>
                                              )}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
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
