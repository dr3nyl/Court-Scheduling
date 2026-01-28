import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import PlayerLayout from "../components/PlayerLayout";

export default function PlayerDashboard() {
  const { user } = useContext(AuthContext);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingCount: 0,
    thisMonthCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/player/bookings?upcoming=true");
      const bookings = res.data || [];
      
      setUpcomingBookings(bookings.slice(0, 5)); // Show next 5 bookings
      
      // Calculate stats
      const allRes = await api.get("/player/bookings");
      const allBookings = allRes.data || [];
      const today = new Date();
      const thisMonth = today.getMonth();
      const thisYear = today.getFullYear();
      
      const thisMonthBookings = allBookings.filter((booking) => {
        const bookingDate = new Date(booking.date);
        return (
          bookingDate.getMonth() === thisMonth &&
          bookingDate.getFullYear() === thisYear &&
          booking.status === "confirmed"
        );
      });

      setStats({
        totalBookings: allBookings.filter((b) => b.status === "confirmed").length,
        upcomingCount: bookings.length,
        thisMonthCount: thisMonthBookings.length,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    return timeString.slice(0, 5); // Format as HH:MM
  };

  return (
    <PlayerLayout>
      {/* Page Header */}
      <div style={{ marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          Welcome back, Player {user?.name}!
        </h1>
        <p style={{ color: "#6b7280", fontSize: isMobile ? "0.9rem" : "1rem" }}>
          Manage your court bookings and find available slots
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>
          Quick Actions
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <Link
            to="/player/book"
            style={{
              display: "block",
              padding: isMobile ? "1rem" : "1.5rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              borderRadius: "0.75rem",
              textDecoration: "none",
              textAlign: "center",
              fontWeight: 600,
              fontSize: isMobile ? "1rem" : "1.1rem",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }}
          >
            Book a Court
          </Link>
          <Link
            to="/player/bookings"
            style={{
              display: "block",
              padding: isMobile ? "1rem" : "1.5rem",
              backgroundColor: "#ffffff",
              color: "#374151",
              borderRadius: "0.75rem",
              textDecoration: "none",
              textAlign: "center",
              fontWeight: 600,
              fontSize: isMobile ? "1rem" : "1.1rem",
              border: "2px solid #e5e7eb",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            View All Bookings
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>
          Your Stats
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <div
            style={{
              padding: isMobile ? "1rem" : "1.5rem",
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: isMobile ? "0.75rem" : "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
              Total Bookings
            </div>
            <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827" }}>
              {loading ? "..." : stats.totalBookings}
            </div>
          </div>
          <div
            style={{
              padding: isMobile ? "1rem" : "1.5rem",
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: isMobile ? "0.75rem" : "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
              Upcoming
            </div>
            <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#2563eb" }}>
              {loading ? "..." : stats.upcomingCount}
            </div>
          </div>
          <div
            style={{
              padding: isMobile ? "1rem" : "1.5rem",
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: isMobile ? "0.75rem" : "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
              This Month
            </div>
            <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#16a34a" }}>
              {loading ? "..." : stats.thisMonthCount}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ fontSize: isMobile ? "1.1rem" : "1.25rem", fontWeight: 600, color: "#111827" }}>
            Upcoming Bookings
          </h2>
          {upcomingBookings.length > 0 && (
            <Link
              to="/player/bookings"
              style={{
                color: "#2563eb",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              View all →
            </Link>
          )}
        </div>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading bookings...</p>
        ) : error ? (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              No upcoming bookings
            </p>
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
              Book Your First Court
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                style={{
                  padding: isMobile ? "1rem" : "1.25rem",
                  backgroundColor: "#ffffff",
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: isMobile ? "1rem" : "1.1rem", color: "#111827", marginBottom: "0.25rem" }}>
                    {booking.court?.name || "Court"}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: isMobile ? "0.85rem" : "0.9rem", wordBreak: "break-word" }}>
                    {formatDate(booking.date)} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.25rem 0.75rem",
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    borderRadius: "999px",
                    fontSize: isMobile ? "0.8rem" : "0.85rem",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {booking.status === "confirmed" ? "Confirmed" : booking.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlayerLayout>
  );
}
