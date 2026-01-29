import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import OwnerLayout from "../components/OwnerLayout";

export default function OwnerDashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    total_courts: 0,
    active_courts: 0,
    total_bookings: 0,
    today_bookings: 0,
    today_revenue: 0,
    today_games_played: 0,
    today_cancelled: 0,
    this_week_bookings: 0,
    this_month_bookings: 0,
    upcoming_bookings: 0,
  });
  const [todayBookings, setTodayBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      // Load stats and today's bookings in parallel
      const [statsRes, bookingsRes] = await Promise.all([
        api.get("/owner/stats"),
        api.get("/owner/bookings?date=" + new Date().toISOString().slice(0, 10)),
      ]);

      setStats(statsRes.data);
      const bookingsList = Array.isArray(bookingsRes.data) ? bookingsRes.data : (bookingsRes.data?.data ?? []);
      setTodayBookings(bookingsList.slice(0, 5)); // Show first 5 today bookings
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    return timeString.slice(0, 5);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(amount ?? 0);
  };

  return (
    <OwnerLayout>
      {/* Page Header */}
      <div style={{ marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          Welcome back, {user?.name}!
        </h1>
        <p style={{ color: "#6b7280", fontSize: isMobile ? "0.9rem" : "1rem" }}>
          Manage your courts and track bookings
        </p>
      </div>

      {/* Today's Summary */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>
          Today&apos;s Summary
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "1rem",
          }}
        >
          <div
            style={{
              padding: isMobile ? "1rem" : "1.25rem",
              backgroundColor: "#ecfdf5",
              borderRadius: "0.75rem",
              border: "1px solid #a7f3d0",
            }}
          >
            <div style={{ fontSize: isMobile ? "0.75rem" : "0.875rem", color: "#065f46", marginBottom: "0.5rem" }}>
              Revenue
            </div>
            <div style={{ fontSize: isMobile ? "1.25rem" : "1.5rem", fontWeight: "bold", color: "#047857" }}>
              {loading ? "..." : formatCurrency(stats.today_revenue)}
            </div>
          </div>
          <div
            style={{
              padding: isMobile ? "1rem" : "1.25rem",
              backgroundColor: "#eff6ff",
              borderRadius: "0.75rem",
              border: "1px solid #bfdbfe",
            }}
          >
            <div style={{ fontSize: isMobile ? "0.75rem" : "0.875rem", color: "#1e40af", marginBottom: "0.5rem" }}>
              Games Played
            </div>
            <div style={{ fontSize: isMobile ? "1.25rem" : "1.5rem", fontWeight: "bold", color: "#2563eb" }}>
              {loading ? "..." : stats.today_games_played}
            </div>
          </div>
          <div
            style={{
              padding: isMobile ? "1rem" : "1.25rem",
              backgroundColor: "#fef2f2",
              borderRadius: "0.75rem",
              border: "1px solid #fecaca",
            }}
          >
            <div style={{ fontSize: isMobile ? "0.75rem" : "0.875rem", color: "#991b1b", marginBottom: "0.5rem" }}>
              Cancelled
            </div>
            <div style={{ fontSize: isMobile ? "1.25rem" : "1.5rem", fontWeight: "bold", color: "#dc2626" }}>
              {loading ? "..." : stats.today_cancelled}
            </div>
          </div>
        </div>
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
            to="/owner/courts"
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
            Manage Courts
          </Link>
          <Link
            to="/owner/bookings"
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
          Statistics
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(180px, 1fr))",
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
              Total Courts
            </div>
            <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827" }}>
              {loading ? "..." : stats.total_courts}
            </div>
            <div style={{ fontSize: isMobile ? "0.7rem" : "0.75rem", color: "#16a34a", marginTop: "0.25rem" }}>
              {stats.active_courts} active
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
              Today's Bookings
            </div>
            <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#2563eb" }}>
              {loading ? "..." : stats.today_bookings}
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
              This Week
            </div>
            <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#16a34a" }}>
              {loading ? "..." : stats.this_week_bookings}
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
            <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#7c3aed" }}>
              {loading ? "..." : stats.this_month_bookings}
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
            <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#ea580c" }}>
              {loading ? "..." : stats.upcoming_bookings}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Bookings */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ fontSize: isMobile ? "1.1rem" : "1.25rem", fontWeight: 600, color: "#111827" }}>
            Today's Bookings
          </h2>
          {todayBookings.length > 0 && (
            <Link
              to="/owner/bookings"
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
        ) : todayBookings.length === 0 ? (
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
              No bookings scheduled for today
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
            {todayBookings.map((booking) => (
              <div
                key={booking.id}
                style={{
                  padding: "1.25rem",
                  backgroundColor: "#ffffff",
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: isMobile ? "1rem" : "1.1rem", color: "#111827", marginBottom: "0.25rem" }}>
                    {booking.court?.name || "Court"}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: isMobile ? "0.85rem" : "0.9rem", wordBreak: "break-word" }}>
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)} • {booking.user?.name || "Guest"}
                  </div>
                </div>
                <div
                  style={{
                    padding: "0.25rem 0.75rem",
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    borderRadius: "999px",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                  }}
                >
                  {booking.status === "confirmed" ? "Confirmed" : booking.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}