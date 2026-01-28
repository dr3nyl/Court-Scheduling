import { useState, useEffect } from "react";
import api from "../services/api";
import PlayerLayout from "../components/PlayerLayout";

// Helper to get today's date in YYYY-MM-DD (for the date input)
const todayString = () => new Date().toISOString().slice(0, 10);

// Helper to build a small 7‑day "calendar strip"
const buildNext7Days = () => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    // Format date string manually to avoid timezone issues with toISOString()
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({
      value: dateStr,
      label: d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  }

  return days;
};

export default function PlayerBooking() {
  const [date, setDate] = useState(todayString());
  const [courts, setCourts] = useState([]);
  const [filterCourt, setFilterCourt] = useState("all");
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null); // { courtId, slot, courtName }
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load available courts/slots whenever date changes
  useEffect(() => {
    if (!date) return;

    setLoading(true);
    setError("");

    api
      .get(`/player/courts?date=${date}`)
      .then((res) => {
        setCourts(res.data || []);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load available courts. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [date]);

  const handleBookClick = (courtId, slot, courtName) => {
    setConfirmDialog({ courtId, slot, courtName });
  };

  const handleConfirmBooking = async () => {
    if (!confirmDialog || !date) return;

    const { courtId, slot } = confirmDialog;
    setBookingLoading(true);
    setError("");
    setSuccess("");
    setConfirmDialog(null);

    try {
      await api.post(`/courts/${courtId}/bookings`, {
        date,
        start_time: slot.start,
        end_time: slot.end,
      });

      setSuccess("Booking confirmed! You can view it in My Bookings.");

      // Refresh slots so newly booked slot becomes unavailable
      try {
        const res = await api.get(`/player/courts?date=${date}`);
        setCourts(res.data || []);
      } catch (refreshErr) {
        console.error("Failed to refresh courts after booking", refreshErr);
      }
    } catch (err) {
      console.error(err);
      const backendMessage =
        err?.response?.data?.message || "Booking failed. Please try again.";
      setError(backendMessage);
    } finally {
      setBookingLoading(false);
    }
  };

  const isSlotInPast = (slot) => {
    if (date !== todayString()) return false;
    const now = new Date();
    const [hours, minutes] = slot.start.split(":").map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime < now;
  };

  const days = buildNext7Days();

  // Filter courts if filter is set
  const filteredCourts = filterCourt === "all" 
    ? courts 
    : courts.filter(c => c.id.toString() === filterCourt);

  // Get unique courts for filter dropdown
  const uniqueCourts = courts.map(c => ({ id: c.id, name: c.name }));

  return (
    <PlayerLayout>
      {/* Page Header */}
      <div style={{ marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          Book a Court
        </h1>
        <p style={{ color: "#6b7280", fontSize: isMobile ? "0.9rem" : "1rem" }}>
          Choose a date and time slot to book your court
        </p>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: isMobile ? "0.5rem" : undefined,
          }}
          onClick={() => setConfirmDialog(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: isMobile ? "1rem" : "2rem",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: isMobile ? "1.1rem" : "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>
              Confirm Booking
            </h3>
            <div style={{ marginBottom: "1.5rem", color: "#374151" }}>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Court:</strong> {confirmDialog.courtName}
              </p>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Date:</strong> {new Date(date).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p>
                <strong>Time:</strong> {confirmDialog.slot.start} - {confirmDialog.slot.end}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 500,
                  flex: isMobile ? 1 : "none",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={bookingLoading}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: bookingLoading ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  opacity: bookingLoading ? 0.6 : 1,
                  flex: isMobile ? 1 : "none",
                }}
              >
                {bookingLoading ? "Booking..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date selector area */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
          padding: isMobile ? "1rem" : "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <label style={{ fontWeight: 600, display: "block", marginBottom: "0.75rem", color: "#111827" }}>
          Select Date
        </label>

        {/* Native date input */}
        <input
          type="date"
          value={date}
          min={todayString()}
          onChange={(e) => {
            setDate(e.target.value);
            setError("");
            setSuccess("");
          }}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            maxWidth: isMobile ? "100%" : "220px",
            marginBottom: "1rem",
            fontSize: "0.95rem",
          }}
        />

        {/* 7‑day "calendar strip" buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "nowrap",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "0.25rem",
          }}
        >
          {days.map((d) => {
            const isSelected = d.value === date;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => {
                  setDate(d.value);
                  setError("");
                  setSuccess("");
                }}
                style={{
                  padding: isMobile ? "0.5rem 0.75rem" : "0.4rem 0.75rem",
                  borderRadius: "999px",
                  border: isSelected ? "1px solid #2563eb" : "1px solid #e5e7eb",
                  backgroundColor: isSelected ? "#2563eb" : "#ffffff",
                  color: isSelected ? "#ffffff" : "#111827",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "background-color 0.15s, color 0.15s, border 0.15s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.5rem",
            color: "#b91c1c",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={{
              background: "none",
              border: "none",
              color: "#b91c1c",
              cursor: "pointer",
              fontSize: "1.25rem",
              padding: "0",
              marginLeft: "1rem",
            }}
          >
            ×
          </button>
        </div>
      )}
      {success && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#dcfce7",
            border: "1px solid #86efac",
            borderRadius: "0.5rem",
            color: "#166534",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
            style={{
              background: "none",
              border: "none",
              color: "#166534",
              cursor: "pointer",
              fontSize: "1.25rem",
              padding: "0",
              marginLeft: "1rem",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Court Filter */}
      {courts.length > 1 && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem", color: "#111827" }}>
            Filter by Court
          </label>
          <select
            value={filterCourt}
            onChange={(e) => setFilterCourt(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              fontSize: "0.95rem",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              width: isMobile ? "100%" : undefined,
            }}
          >
            <option value="all">All Courts</option>
            {uniqueCourts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            color: "#6b7280",
          }}
        >
          Loading available courts...
        </div>
      )}

      {/* Courts + slots */}
      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {filteredCourts.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "3rem",
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#6b7280", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                {filterCourt !== "all"
                  ? "No available slots for the selected court on this date."
                  : "No available courts for this date."}
              </p>
              <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                Try selecting a different date or court.
              </p>
            </div>
          ) : (
            filteredCourts.map((court) => {
              const availableSlots = court.slots?.filter(s => s.available && !isSlotInPast(s)) || [];
              const bookedSlots = court.slots?.filter(s => !s.available) || [];
              const pastSlots = court.slots?.filter(s => s.available && isSlotInPast(s)) || [];

              return (
                <div
                  key={court.id}
                  style={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e7eb",
                    padding: isMobile ? "1rem" : "1.5rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <h3 style={{ fontSize: isMobile ? "1.1rem" : "1.25rem", fontWeight: 600, marginBottom: "0.5rem", color: "#111827" }}>
                    {court.name}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "#6b7280",
                      marginBottom: "1rem",
                    }}
                  >
                    {availableSlots.length > 0
                      ? `${availableSlots.length} slot${availableSlots.length !== 1 ? "s" : ""} available`
                      : "No available slots"}
                  </p>

                  {court.slots && court.slots.length > 0 ? (
                    <div>
                      {/* Available slots */}
                      {availableSlots.length > 0 && (
                        <div style={{ marginBottom: "1rem" }}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                            }}
                          >
                            {availableSlots.map((slot) => (
                              <button
                                key={slot.start}
                                type="button"
                                disabled={bookingLoading}
                                onClick={() => handleBookClick(court.id, slot, court.name)}
                                title={`Book ${slot.start} - ${slot.end}`}
                                style={{
                                  padding: "0.5rem 0.75rem",
                                  borderRadius: "0.5rem",
                                  border: "1px solid #16a34a",
                                  backgroundColor: "#dcfce7",
                                  color: "#166534",
                                  fontSize: isMobile ? "0.85rem" : "0.85rem",
                                  fontWeight: 500,
                                  cursor: bookingLoading ? "not-allowed" : "pointer",
                                  opacity: bookingLoading ? 0.6 : 1,
                                  transition: "all 0.2s",
                                  width: isMobile ? "100%" : undefined,
                                }}
                                onMouseEnter={(e) => {
                                  if (!bookingLoading) {
                                    e.currentTarget.style.backgroundColor = "#bbf7d0";
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#dcfce7";
                                  e.currentTarget.style.transform = "translateY(0)";
                                }}
                              >
                                {slot.start} – {slot.end}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Booked slots (grayed out) */}
                      {bookedSlots.length > 0 && (
                        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
                          <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "0.5rem" }}>
                            Booked
                          </p>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                            }}
                          >
                            {bookedSlots.map((slot) => (
                              <span
                                key={slot.start}
                                style={{
                                  padding: "0.5rem 0.75rem",
                                  borderRadius: "0.5rem",
                                  border: "1px solid #d1d5db",
                                  backgroundColor: "#f9fafb",
                                  color: "#9ca3af",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {slot.start} – {slot.end}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Past slots (if today) */}
                      {pastSlots.length > 0 && (
                        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
                          <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "0.5rem" }}>
                            Past
                          </p>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                            }}
                          >
                            {pastSlots.map((slot) => (
                              <span
                                key={slot.start}
                                style={{
                                  padding: "0.5rem 0.75rem",
                                  borderRadius: "0.5rem",
                                  border: "1px solid #d1d5db",
                                  backgroundColor: "#f9fafb",
                                  color: "#9ca3af",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {slot.start} – {slot.end}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                      No slots configured for this court.
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </PlayerLayout>
  );
}
