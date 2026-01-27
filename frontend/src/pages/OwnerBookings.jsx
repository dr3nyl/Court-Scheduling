import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import OwnerLayout from "../components/OwnerLayout";

export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all', 'upcoming', 'today', 'cancelled'
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let url = "/owner/bookings";
      const params = [];

      if (filter === "upcoming") {
        params.push("upcoming=true");
      } else if (filter === "today") {
        params.push(`date=${new Date().toISOString().slice(0, 10)}`);
      } else if (filter === "cancelled") {
        params.push("status=cancelled");
      }

      if (dateFilter) {
        params.push(`date=${dateFilter}`);
      }

      if (params.length > 0) {
        url += "?" + params.join("&");
      }

      const res = await api.get(url);
      setBookings(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, dateFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

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

  const todayCount = bookings.filter((b) => {
    const today = new Date().toISOString().slice(0, 10);
    return b.date === today && b.status === "confirmed";
  }).length;

  const upcomingCount = bookings.filter(isUpcoming).length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;

  return (
    <OwnerLayout>
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          All Bookings
        </h1>
        <p style={{ color: "#6b7280", fontSize: "1rem" }}>
          View and manage bookings across all your courts
        </p>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1rem",
            borderBottom: "2px solid #e5e7eb",
            flexWrap: "wrap",
          }}
        >
          {[
            { key: "all", label: "All", count: bookings.length },
            { key: "today", label: "Today", count: todayCount },
            { key: "upcoming", label: "Upcoming", count: upcomingCount },
            { key: "cancelled", label: "Cancelled", count: cancelledCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key);
                setDateFilter("");
              }}
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

        {/* Date Filter */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>
            Filter by Date:
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setFilter("all");
            }}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              fontSize: "0.95rem",
            }}
          />
          {dateFilter && (
            <button
              onClick={() => {
                setDateFilter("");
                loadBookings();
              }}
              style={{
                padding: "0.5rem 0.75rem",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              Clear Date Filter
            </button>
          )}
        </div>
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
      ) : bookings.length === 0 ? (
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
            {filter === "today"
              ? "No bookings scheduled for today"
              : filter === "upcoming"
              ? "No upcoming bookings"
              : filter === "cancelled"
              ? "No cancelled bookings"
              : dateFilter
              ? "No bookings found for the selected date"
              : "No bookings yet"}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {bookings.map((booking) => {
            const isUpcomingBooking = isUpcoming(booking);
            const isCancelled = booking.status === "cancelled";

            return (
              <div
                key={booking.id}
                style={{
                  padding: "1.5rem",
                  backgroundColor: "#ffffff",
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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
                        gap: "1rem",
                        marginBottom: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "1.25rem",
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
                          fontSize: "0.85rem",
                          fontWeight: 500,
                        }}
                      >
                        {isCancelled ? "Cancelled" : isUpcomingBooking ? "Confirmed" : "Past"}
                      </span>
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                      <strong>Date:</strong> {formatDate(booking.date)}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                      <strong>Time:</strong> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                      <strong>Player:</strong> {booking.user?.name || "Guest"} {booking.user?.email && `(${booking.user.email})`}
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
                        fontSize: "0.9rem",
                        opacity: cancellingId === booking.id ? 0.6 : 1,
                      }}
                    >
                      {cancellingId === booking.id ? "Cancelling..." : "Cancel Booking"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </OwnerLayout>
  );
}
