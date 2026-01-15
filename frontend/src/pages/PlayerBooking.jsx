import { useState, useEffect } from "react";
import api from "../services/api";

// Helper to get today's date in YYYY-MM-DD (for the date input)
const todayString = () => new Date().toISOString().slice(0, 10);

// Helper to build a small 7‑day "calendar strip"
const buildNext7Days = () => {
  const days = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      value: d.toISOString().slice(0, 10),
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
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handleBook = async (courtId, slot) => {
    if (!date || !slot) return;

    setBookingLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post(`/courts/${courtId}/bookings`, {
        date,
        start_time: slot.start,
        end_time: slot.end,
      });

      setSuccess("Booking confirmed!");

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

  const days = buildNext7Days();

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem" }}>
      <h2 style={{ marginBottom: "1rem" }}>Book a Court</h2>

      {/* Date selector area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <label style={{ fontWeight: 600 }}>Select date</label>

        {/* Native date input */}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            maxWidth: "220px",
          }}
        />

        {/* 7‑day "calendar strip" buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          {days.map((d) => {
            const isSelected = d.value === date;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setDate(d.value)}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "999px",
                  border: isSelected ? "1px solid #2563eb" : "1px solid #e5e7eb",
                  backgroundColor: isSelected ? "#2563eb" : "#ffffff",
                  color: isSelected ? "#ffffff" : "#111827",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "background-color 0.15s, color 0.15s, border 0.15s",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status messages */}
      {loading && <p>Loading available courts…</p>}
      {error && (
        <p style={{ color: "#b91c1c", marginBottom: "0.75rem" }}>{error}</p>
      )}
      {success && (
        <p style={{ color: "#15803d", marginBottom: "0.75rem" }}>{success}</p>
      )}

      {/* Courts + slots */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {courts.length === 0 && !loading && (
          <p>No available courts for this date.</p>
        )}

        {courts.map((court) => (
          <div
            key={court.id}
            style={{
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              padding: "1rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              backgroundColor: "#ffffff",
            }}
          >
            <h3 style={{ marginBottom: "0.5rem" }}>{court.name}</h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6b7280",
                marginBottom: "0.75rem",
              }}
            >
              Select a time slot to book.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              {court.slots && court.slots.length > 0 ? (
                court.slots.map((slot) => {
                  const isAvailable = slot.available;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={!isAvailable || bookingLoading}
                      onClick={() => isAvailable && handleBook(court.id, slot)}
                      style={{
                        padding: "0.35rem 0.6rem",
                        borderRadius: "999px",
                        border: "1px solid",
                        borderColor: isAvailable ? "#16a34a" : "#d1d5db",
                        backgroundColor: isAvailable ? "#dcfce7" : "#f9fafb",
                        color: isAvailable ? "#166534" : "#9ca3af",
                        fontSize: "0.8rem",
                        cursor: isAvailable ? "pointer" : "not-allowed",
                        opacity: bookingLoading && isAvailable ? 0.8 : 1,
                      }}
                    >
                      {slot.start} – {slot.end}
                    </button>
                  );
                })
              ) : (
                <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  No slots configured.
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
