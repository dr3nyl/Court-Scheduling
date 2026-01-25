import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import PlayerLayout from "../components/PlayerLayout";

export default function PlayerBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all', 'upcoming', 'past', 'cancelled'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

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

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "upcoming") return isUpcoming(booking);
    if (filter === "past") return isPast(booking);
    if (filter === "cancelled") return booking.status === "cancelled";
    return true; // 'all'
  });

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
      ) : filteredBookings.length === 0 ? (
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
            {filter === "upcoming"
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
            gap: "0.75rem",
          }}
        >
          {filteredBookings.map((booking) => {
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
                          backgroundColor:
                            isCancelled
                              ? "#fee2e2"
                              : isUpcomingBooking
                              ? "#dcfce7"
                              : "#f3f4f6",
                          color:
                            isCancelled
                              ? "#991b1b"
                              : isUpcomingBooking
                              ? "#166534"
                              : "#374151",
                          borderRadius: "999px",
                          fontSize: "0.85rem",
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
                    <div style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                      <strong>Date:</strong> {formatDate(booking.date)}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                      <strong>Time:</strong> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
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
    </PlayerLayout>
  );
}
