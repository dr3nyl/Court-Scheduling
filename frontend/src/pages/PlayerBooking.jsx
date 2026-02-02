import { useState, useEffect } from "react";
import api from "../services/api";
import PlayerLayout from "../components/PlayerLayout";
import toast from "react-hot-toast";

// Helper to get today's date in YYYY-MM-DD (for the date input)
const todayString = () => new Date().toISOString().slice(0, 10);

// Helper to get date string for today + n days (for max date)
const addDaysString = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// Helper to build "calendar strip" for the next N days (advance booking window)
const buildNextDays = (maxDays) => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = Math.max(1, Math.min(maxDays, 14)); // clamp 1–14 for sanity

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
  const [selectedSlots, setSelectedSlots] = useState([]); // Array of { courtId, courtName, slot, hourlyRate, reservationFeePercentage }
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [paymentOption, setPaymentOption] = useState("full"); // "full" or "reservation"
  const [isMobile, setIsMobile] = useState(false);
  const [bookingSuccessResult, setBookingSuccessResult] = useState(null); // { bookings: [...] } after successful booking
  const [advanceBookingDays, setAdvanceBookingDays] = useState(7); // max days ahead (from /config)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load app config (advance booking limit) once
  useEffect(() => {
    api
      .get("/config")
      .then((res) => {
        const n = res.data?.advance_booking_days;
        if (typeof n === "number" && n >= 1) setAdvanceBookingDays(n);
      })
      .catch(() => {});
  }, []);

  const maxDateString = addDaysString(Math.max(0, advanceBookingDays - 1));

  // Clamp selected date to advance booking window when config loads
  useEffect(() => {
    if (!date) return;
    const today = todayString();
    if (date < today) setDate(today);
    else if (date > maxDateString) setDate(maxDateString);
  }, [advanceBookingDays]); // eslint-disable-line react-hooks/exhaustive-deps -- clamp when advance window changes

  // Load available courts/slots whenever date changes
  useEffect(() => {
    if (!date) return;

    setLoading(true);
    setError("");

    api
      .get(`/player/courts?date=${date}`)
      .then((res) => {
        setCourts(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load available courts. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [date]);

  const handleBookClick = (courtId, slot, courtName, hourlyRate, reservationFeePercentage) => {
    const slotKey = `${courtId}-${slot.start}-${slot.end}`;
    const isAlreadySelected = selectedSlots.some(
      (s) => `${s.courtId}-${s.slot.start}-${s.slot.end}` === slotKey
    );

    if (isAlreadySelected) {
      setSelectedSlots(selectedSlots.filter((s) => `${s.courtId}-${s.slot.start}-${s.slot.end}` !== slotKey));
    } else {
      if (selectedSlots.length > 0 && selectedSlots[0].courtId !== courtId) {
        toast.error("You are selecting slots from different courts. Please use one court only.");
        return;
      }
      setSelectedSlots([
        ...selectedSlots,
        {
          courtId,
          courtName,
          slot,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
          reservationFeePercentage: reservationFeePercentage ? parseFloat(reservationFeePercentage) : 0,
        },
      ]);
    }
  };

  const removeSelectedSlot = (index) => {
    if (selectedSlots.length === 1) {
      const ok = window.confirm("Remove selected slot?");
      if (!ok) return;
    }
    setSelectedSlots(selectedSlots.filter((_, i) => i !== index));
  };

  const clearSelectedSlots = () => {
    if (selectedSlots.length > 1) {
      const ok = window.confirm(`Clear selection? You have ${selectedSlots.length} slots selected.`);
      if (!ok) return;
    }
    setSelectedSlots([]);
    setSummaryModalOpen(false);
  };

  // Calculate total cost and reservation fee
  const calculateCosts = () => {
    let subtotal = 0;
    selectedSlots.forEach(({ slot, hourlyRate }) => {
      const start = new Date(`2000-01-01 ${slot.start}`);
      const end = new Date(`2000-01-01 ${slot.end}`);
      const hours = (end - start) / (1000 * 60 * 60);
      const rate = typeof hourlyRate === 'number' ? hourlyRate : parseFloat(hourlyRate) || 0;
      subtotal += hours * rate;
    });

    // Get reservation fee percentage (use first slot's percentage, or 0)
    const reservationFeePercentage = typeof selectedSlots[0]?.reservationFeePercentage === 'number' 
      ? selectedSlots[0].reservationFeePercentage 
      : parseFloat(selectedSlots[0]?.reservationFeePercentage) || 0;
    const reservationFee = (subtotal * reservationFeePercentage) / 100;
    
    // Total is the full amount, but player can pay either full or reservation fee only
    const total = subtotal;
    const amountToPay = paymentOption === "full" ? total : reservationFee;
    const remainingBalance = paymentOption === "reservation" ? total - reservationFee : 0;

    return {
      subtotal: total, // Total cost
      reservationFee,
      reservationFeePercentage,
      total,
      amountToPay,
      remainingBalance,
    };
  };

  const handleConfirmBooking = async () => {
    if (selectedSlots.length === 0 || !date) return;

    setBookingLoading(true);
    setError("");
    setSuccess("");

    try {
      // Create all bookings (backend re-validates availability per request)
      const bookingPromises = selectedSlots.map(({ courtId, slot }) =>
        api.post(`/courts/${courtId}/bookings`, {
          date,
          start_time: slot.start,
          end_time: slot.end,
          payment_status: paymentOption === "full" ? "paid" : "reserved",
        })
      );

      const responses = await Promise.all(bookingPromises);
      const createdBookings = responses.map((r) => r.data?.data ?? r.data);

      setBookingSuccessResult({ bookings: createdBookings });
      toast.success("Booking created successfully");

      // Refresh slots so newly booked slots become unavailable
      try {
        const res = await api.get(`/player/courts?date=${date}`);
        setCourts(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      } catch (refreshErr) {
        console.error("Failed to refresh courts after booking", refreshErr);
      }
    } catch (err) {
      console.error(err);
      const backendMessage =
        err?.response?.data?.message || err?.response?.data?.errors?.date?.[0] || "Booking failed. Slot may have been taken. Please try again.";
      setError(backendMessage);
    } finally {
      setBookingLoading(false);
    }
  };

  const closeBookingSuccess = () => {
    setBookingSuccessResult(null);
    setSelectedSlots([]);
    setSummaryModalOpen(false);
    setPaymentOption("full");
  };

  const isSlotInPast = (slot) => {
    if (date !== todayString()) return false;
    const now = new Date();
    const [hours, minutes] = slot.start.split(":").map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime < now;
  };

  const days = buildNextDays(advanceBookingDays);

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

      {/* Summary Modal */}
      {summaryModalOpen && (selectedSlots.length > 0 || bookingSuccessResult) && (
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
          onClick={() => (bookingSuccessResult ? closeBookingSuccess() : setSummaryModalOpen(false))}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: isMobile ? "1rem" : "2rem",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Post-booking success panel */}
            {bookingSuccessResult ? (
              <>
                <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✓</div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#166534", marginBottom: "0.25rem" }}>
                    Booking confirmed!
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                    Confirmation sent via email / in-app
                  </p>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "0.5rem",
                    border: "1px solid #bbf7d0",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#166534", marginBottom: "0.5rem" }}>
                    Booking reference{bookingSuccessResult.bookings?.length > 1 ? "s" : ""}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#374151", fontFamily: "monospace" }}>
                    {bookingSuccessResult.bookings?.map((b) => `#${b.id}`).join(", ") ?? "-"}
                  </div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "0.5rem",
                    border: "1px solid #e5e7eb",
                    marginBottom: "1.5rem",
                    fontSize: "0.9rem",
                    color: "#374151",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>At the venue</div>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    <li>Show your booking reference or name to staff</li>
                    <li>Arrive 5–10 minutes before your slot</li>
                  </ul>
                </div>
                <button
                  onClick={closeBookingSuccess}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                  }}
                >
                  Done
                </button>
              </>
            ) : (
              <>
            <h3 style={{ fontSize: isMobile ? "1.1rem" : "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>
              Review & Book
            </h3>

            {/* Selected Slots List */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem", color: "#374151" }}>
                Selected Time Slots ({selectedSlots.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "200px", overflowY: "auto" }}>
                {selectedSlots.map((item, index) => {
                  const start = new Date(`2000-01-01 ${item.slot.start}`);
                  const end = new Date(`2000-01-01 ${item.slot.end}`);
                  const hours = (end - start) / (1000 * 60 * 60);
                  const hourlyRate = typeof item.hourlyRate === 'number' ? item.hourlyRate : parseFloat(item.hourlyRate) || 0;
                  const slotCost = hours * hourlyRate;

                  return (
                    <div
                      key={`${item.courtId}-${item.slot.start}-${item.slot.end}`}
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "0.5rem",
                        border: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.9rem" }}>
                          {item.courtName}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.15rem" }}>
                          Indoor · Rubber floor
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>
                          {new Date(date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          • {item.slot.start} - {item.slot.end}
                          {hourlyRate > 0 && (
                            <span style={{ marginLeft: "0.5rem" }}>
                              ({hours.toFixed(1)}h × ₱{hourlyRate.toFixed(2)}/h = ₱{slotCost.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeSelectedSlot(index)}
                        title="Remove this slot"
                        style={{
                          padding: "0.35rem 0.5rem",
                          backgroundColor: "#fef2f2",
                          color: "#991b1b",
                          border: "1px solid #fecaca",
                          borderRadius: "0.25rem",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cost Breakdown */}
            {(() => {
              const { reservationFee, reservationFeePercentage, total, amountToPay, remainingBalance } = calculateCosts();
              return (
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "0.5rem",
                    border: "1px solid #e5e7eb",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>Total Cost:</span>
                    <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>
                      ₱{total.toFixed(2)}
                    </span>
                  </div>
                  {reservationFeePercentage > 0 && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                        <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                          Reservation Fee ({reservationFeePercentage}%):
                        </span>
                        <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>
                          ₱{reservationFee.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Payment Option Selection */}
                      <div style={{ marginBottom: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}>
                        <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem" }}>
                          Payment Option:
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.75rem",
                              backgroundColor: paymentOption === "full" ? "#dbeafe" : "#ffffff",
                              border: `2px solid ${paymentOption === "full" ? "#2563eb" : "#d1d5db"}`,
                              borderRadius: "0.5rem",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            <input
                              type="radio"
                              name="paymentOption"
                              value="full"
                              checked={paymentOption === "full"}
                              onChange={(e) => setPaymentOption(e.target.value)}
                              style={{ cursor: "pointer" }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.9rem" }}>
                                Pay Full Amount
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                ₱{total.toFixed(2)} (pay everything now)
                              </div>
                            </div>
                          </label>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.75rem",
                              backgroundColor: paymentOption === "reservation" ? "#dbeafe" : "#ffffff",
                              border: `2px solid ${paymentOption === "reservation" ? "#2563eb" : "#d1d5db"}`,
                              borderRadius: "0.5rem",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            <input
                              type="radio"
                              name="paymentOption"
                              value="reservation"
                              checked={paymentOption === "reservation"}
                              onChange={(e) => setPaymentOption(e.target.value)}
                              style={{ cursor: "pointer" }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.9rem" }}>
                                Pay Reservation Fee Only
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                ₱{reservationFee.toFixed(2)} now, ₱{remainingBalance.toFixed(2)} at time of play
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Amount to Pay */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid #e5e7eb",
                      marginTop: "0.5rem",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "1rem", color: "#111827" }}>Amount to Pay:</span>
                    <span style={{ fontWeight: 600, fontSize: "1rem", color: "#2563eb" }}>
                      ₱{amountToPay.toFixed(2)}
                    </span>
                  </div>
                  {paymentOption === "reservation" && remainingBalance > 0 && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        padding: "0.75rem",
                        backgroundColor: "#fef3c7",
                        borderRadius: "0.375rem",
                        fontSize: "0.85rem",
                        color: "#92400e",
                      }}
                    >
                      <strong>Note:</strong> Remaining balance of ₱{remainingBalance.toFixed(2)} will be paid at the time of play.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Cancellation policy */}
            <div
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "#fffbeb",
                borderRadius: "0.5rem",
                border: "1px solid #fde68a",
                marginBottom: "1.5rem",
                fontSize: "0.85rem",
                color: "#92400e",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>Cancellation policy</div>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                <li>Reservation or full payment is non-refundable</li>
              </ul>
            </div>

            {/* Payment methods */}
            <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "#6b7280" }}>
              <span style={{ marginRight: "0.5rem" }}>Pay at venue:</span>
              <span style={{ fontWeight: 500, color: "#374151" }}>GCash</span>
              <span style={{ margin: "0 0.35rem" }}>·</span>
              <span style={{ fontWeight: 500, color: "#374151" }}>Maya</span>
            </div>

            {/* Action Buttons + Instant confirmation */}
            <div style={{ marginBottom: "0.75rem", fontSize: "0.8rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span>⚡ Instant confirmation</span>
              <span>·</span>
              <span>📩 Confirmation sent via email / in-app</span>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                onClick={() => setSummaryModalOpen(false)}
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
                {bookingLoading ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog (Legacy - keeping for backward compatibility) */}
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
          max={maxDateString}
          onChange={(e) => {
            setDate(e.target.value);
            setError("");
            setSuccess("");
                  setSelectedSlots([]); // Clear selections when date changes
                  setSummaryModalOpen(false);
                  setPaymentOption("full"); // Reset payment option
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
                  setSelectedSlots([]); // Clear selections when date changes
                  setSummaryModalOpen(false);
                  setPaymentOption("full"); // Reset payment option
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

      {/* Spacer for fixed mobile CTA so content isn't hidden behind it */}
      {selectedSlots.length > 0 && isMobile && <div style={{ height: "80px" }} aria-hidden />}

      {/* Review & Book Button - sticky bottom on mobile */}
      {selectedSlots.length > 0 && (
        <div
          style={{
            position: isMobile ? "fixed" : "sticky",
            bottom: 0,
            left: isMobile ? 0 : undefined,
            right: isMobile ? 0 : undefined,
            width: isMobile ? "100%" : undefined,
            backgroundColor: "#ffffff",
            borderTop: "2px solid #e5e7eb",
            padding: isMobile ? "0.75rem 1rem" : "1rem",
            paddingBottom: isMobile ? "max(0.75rem, env(safe-area-inset-bottom))" : "1rem",
            marginTop: isMobile ? 0 : "1.5rem",
            borderRadius: isMobile ? 0 : "0.75rem 0.75rem 0 0",
            boxShadow: "0 -4px 6px rgba(0,0,0,0.1)",
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "nowrap",
              gap: isMobile ? "0.75rem" : "1rem",
              maxWidth: isMobile ? "100%" : undefined,
            }}
          >
            <div
              style={{
                flex: isMobile ? "1" : undefined,
                minWidth: 0,
                overflow: "hidden",
                display: isMobile ? "flex" : "block",
                alignItems: "center",
                flexWrap: "nowrap",
                gap: isMobile ? "0.35rem" : undefined,
              }}
            >
              {isMobile ? (
                (() => {
                  const timeRange = selectedSlots
                    .map((s) => `${s.slot.start}–${s.slot.end}`)
                    .join(", ");
                  let totalHours = 0;
                  selectedSlots.forEach(({ slot }) => {
                    const start = new Date(`2000-01-01 ${slot.start}`);
                    const end = new Date(`2000-01-01 ${slot.end}`);
                    totalHours += (end - start) / (1000 * 60 * 60);
                  });
                  const hrsLabel = totalHours === 1 ? "1 hr" : `${totalHours} hrs`;
                  const { total } = calculateCosts();
                  return (
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "#374151",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={`${selectedSlots[0]?.courtName ?? "Court"} · ${timeRange} (${hrsLabel}) · ₱${total.toFixed(2)}`}
                    >
                      {selectedSlots[0]?.courtName ?? "Court"} · {timeRange} ({hrsLabel}) · ₱{total.toFixed(2)}
                    </span>
                  );
                })()
              ) : (
                <>
                  <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>
                    {selectedSlots[0]?.courtName ?? "Court"}
                  </div>
                  {(() => {
                    const timeRange = selectedSlots
                      .map((s) => `${s.slot.start}–${s.slot.end}`)
                      .join(" · ");
                    let totalHours = 0;
                    selectedSlots.forEach(({ slot }) => {
                      const start = new Date(`2000-01-01 ${slot.start}`);
                      const end = new Date(`2000-01-01 ${slot.end}`);
                      totalHours += (end - start) / (1000 * 60 * 60);
                    });
                    const hrsLabel = totalHours === 1 ? "1 hr" : `${totalHours} hrs`;
                    const { total } = calculateCosts();
                    const isBackToBack = selectedSlots.length > 1 && selectedSlots.every((s, i) => {
                      if (i === 0) return true;
                      const prevEnd = selectedSlots[i - 1].slot.end;
                      return s.slot.start === prevEnd;
                    });
                    return (
                      <>
                        <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>
                          {timeRange} ({hrsLabel})
                          {isBackToBack && (
                            <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", backgroundColor: "#e0e7ff", color: "#3730a3", padding: "0.1rem 0.4rem", borderRadius: "999px" }}>
                              Back-to-back
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827", marginTop: "0.25rem" }}>
                          Total: ₱{total.toFixed(2)}
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "nowrap", alignItems: "center", flexShrink: 0 }}>
              <button
                onClick={clearSelectedSlots}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "#f3f4f6",
                  color: "#6b7280",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.85rem",
                }}
              >
                Clear selection
              </button>
              <button
                onClick={() => setSummaryModalOpen(true)}
                style={{
                  padding: "0.5rem 1.5rem",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                Review & Book
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <h3 style={{ fontSize: isMobile ? "1.1rem" : "1.25rem", fontWeight: 600, marginBottom: "0.25rem", color: "#111827" }}>
                    {court.name}
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "1rem" }}>
                    Select a time slot
                  </p>
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
                            {availableSlots.map((slot) => {
                              const slotKey = `${court.id}-${slot.start}-${slot.end}`;
                              const isSelected = selectedSlots.some(
                                (s) => `${s.courtId}-${s.slot.start}-${s.slot.end}` === slotKey
                              );
                              const start = new Date(`2000-01-01 ${slot.start}`);
                              const end = new Date(`2000-01-01 ${slot.end}`);
                              const hours = (end - start) / (1000 * 60 * 60);
                              const rate = typeof court.hourly_rate === "number" ? court.hourly_rate : parseFloat(court.hourly_rate) || 0;
                              const slotPrice = hours * rate;

                              return (
                                <button
                                  key={slot.start}
                                  type="button"
                                  disabled={bookingLoading}
                                  onClick={() =>
                                    handleBookClick(
                                      court.id,
                                      slot,
                                      court.name,
                                      court.hourly_rate,
                                      court.reservation_fee_percentage
                                    )
                                  }
                                  title={isSelected ? `Remove ${slot.start} - ${slot.end}` : `Add ${slot.start} - ${slot.end}`}
                                  style={{
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "0.5rem",
                                    border: isSelected ? "2px solid #2563eb" : "2px solid #16a34a",
                                    backgroundColor: isSelected ? "#2563eb" : "transparent",
                                    color: isSelected ? "#ffffff" : "#166534",
                                    fontSize: isMobile ? "0.85rem" : "0.85rem",
                                    fontWeight: 500,
                                    cursor: bookingLoading ? "not-allowed" : "pointer",
                                    opacity: bookingLoading ? 0.6 : 1,
                                    transition: "all 0.2s",
                                    width: isMobile ? "100%" : undefined,
                                    position: "relative",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                    minWidth: "5rem",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!bookingLoading) {
                                      e.currentTarget.style.backgroundColor = isSelected ? "#1d4ed8" : "#f0fdf4";
                                      e.currentTarget.style.transform = "translateY(-1px)";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isSelected ? "#2563eb" : "transparent";
                                    e.currentTarget.style.transform = "translateY(0)";
                                  }}
                                >
                                  {isSelected && (
                                    <span
                                      style={{
                                        position: "absolute",
                                        top: "0.25rem",
                                        right: "0.25rem",
                                        color: "#ffffff",
                                        fontSize: "0.75rem",
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                  <span>{slot.start} – {slot.end}</span>
                                  {rate > 0 && (
                                    <span style={{ fontSize: "0.75rem", marginTop: "0.15rem", opacity: isSelected ? 0.9 : 0.85 }}>
                                      ₱{slotPrice.toFixed(0)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Booked slots (light gray + lock) */}
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
                                  border: "1px solid #e5e7eb",
                                  backgroundColor: "#f3f4f6",
                                  color: "#9ca3af",
                                  fontSize: "0.85rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                }}
                              >
                                <span aria-hidden>🔒</span>
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
