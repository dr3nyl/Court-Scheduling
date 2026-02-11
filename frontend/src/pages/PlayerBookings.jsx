import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PlayerLayout from "../components/PlayerLayout";
import EmptyState from "../components/EmptyState";
import BookingFilters from "../components/bookings/BookingFilters";
import BookingDateGroup from "../components/bookings/BookingDateGroup";
import { useBookings } from "../hooks/useBookings";
import { formatTime, isUpcoming } from "../utils/bookingUtils";

export default function PlayerBookings() {
  const [isMobile, setIsMobile] = useState(false);

  const {
    filter,
    setFilter,
    loading,
    error,
    cancellingId,
    expandedDates,
    expandedSessions,
    dateSearch,
    setDateSearch,
    datePickerValue,
    menuOpen,
    setMenuOpen,
    cancelConfirm,
    setCancelConfirm,
    bottomSheet,
    setBottomSheet,
    thisWeekOnly,
    setThisWeekOnly,
    groupedBookings,
    upcomingCount,
    pastCount,
    cancelledCount,
    bookings,
    todayCardRef,
    toggleDate,
    toggleSession,
    sessionKey,
    jumpToToday,
    applyQuickFilter,
    clearDateFilters,
    handleDatePickerChange,
    handleCancelSession,
  } = useBookings();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

      <BookingFilters
        isMobile={isMobile}
        filter={filter}
        onFilterChange={setFilter}
        tabs={[
          { key: "upcoming", label: "Upcoming", count: upcomingCount },
          { key: "past", label: "Past", count: pastCount },
          { key: "cancelled", label: "Cancelled", count: cancelledCount },
          { key: "all", label: "All", count: bookings.length },
        ]}
        datePickerValue={datePickerValue}
        onDatePickerChange={handleDatePickerChange}
        onTodayClick={() => applyQuickFilter("today")}
        onThisWeekClick={() => applyQuickFilter("thisWeek")}
        thisWeekOnly={thisWeekOnly}
        onJumpToToday={jumpToToday}
        dateSearch={dateSearch}
        onSearchChange={(value) => {
          setDateSearch(value);
          setThisWeekOnly(false);
        }}
        hasActiveFilters={!!(dateSearch || datePickerValue || thisWeekOnly)}
        onClearFilters={clearDateFilters}
      />

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
          {groupedBookings.map(({ date, bookings: dateBookings, courts, dateStatus }) => (
            <BookingDateGroup
              key={date}
              date={date}
              dateBookings={dateBookings}
              courts={courts}
              dateStatus={dateStatus}
              isMobile={isMobile}
              isExpanded={expandedDates.has(date)}
              todayCardRef={todayCardRef}
              onToggleDate={toggleDate}
              expandedSessions={expandedSessions}
              sessionKey={sessionKey}
              onToggleSession={toggleSession}
              menuOpen={menuOpen}
              onMenuOpen={setMenuOpen}
            />
          ))}
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
