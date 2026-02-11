/**
 * Renders a single date group (one day's bookings with courts and sessions).
 * Presentational — receives all state and handlers via props.
 */
import { formatDateShort, formatTime, isToday } from "../../utils/bookingUtils";

const STATUS_CONFIG = {
  today: { label: "Today", bg: "#dbeafe", color: "#1e40af" },
  upcoming: { label: "Upcoming", bg: "#dcfce7", color: "#166534" },
  past: { label: "Past", bg: "#f3f4f6", color: "#6b7280" },
  cancelled: { label: "Cancelled", bg: "#fee2e2", color: "#991b1b" },
};

export default function BookingDateGroup({
  date,
  dateBookings,
  courts,
  dateStatus,
  isMobile,
  isExpanded,
  todayCardRef,
  onToggleDate,
  expandedSessions,
  sessionKey,
  onToggleSession,
  menuOpen,
  onMenuOpen,
}) {
  const isDateToday = isToday(date);
  const status = STATUS_CONFIG[dateStatus] || STATUS_CONFIG.past;

  return (
    <div
      id={`date-card-${date}`}
      ref={isDateToday ? todayCardRef : undefined}
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "0.75rem",
        border: `1px solid ${isDateToday ? "#93c5fd" : "#e5e7eb"}`,
        boxShadow: isDateToday ? "0 2px 8px rgba(37, 99, 235, 0.12)" : "0 1px 2px rgba(0,0,0,0.05)",
        overflow: "hidden",
        transition: "all 0.2s ease",
      }}
    >
      <button
        type="button"
        onClick={() => onToggleDate(date)}
        style={{
          width: "100%",
          padding: isMobile ? "1rem" : "1rem 1.25rem",
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "left",
          minHeight: isMobile ? 48 : 56,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, flexWrap: "wrap" }}>
          <div style={{ fontSize: isMobile ? "1.05rem" : "1.2rem", fontWeight: 600, color: "#111827" }}>
            {formatDateShort(date)}
          </div>
          <span
            style={{
              padding: "0.2rem 0.6rem",
              backgroundColor: status.bg,
              color: status.color,
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {status.label}
          </span>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            {dateBookings.length} {dateBookings.length === 1 ? "booking" : "bookings"} · {status.label}
          </span>
        </div>
        <span
          style={{
            fontSize: "1rem",
            color: "#9ca3af",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {isExpanded && (
        <div
          style={{
            padding: isMobile ? "0 1rem 1rem" : "0 1.25rem 1.25rem",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {courts?.map((courtGroup) => (
              <div key={courtGroup.courtId} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                  {courtGroup.courtName}
                </div>
                {(courtGroup.sessions || []).map((session) => {
                  const key = sessionKey(courtGroup.courtId, session.start_time);
                  const isSessionExpanded = expandedSessions.has(key);
                  const timeRange = `${formatTime(session.start_time)}–${formatTime(session.end_time)}`;
                  const hrsLabel = session.durationHrs === 1 ? "1 hr" : `${session.durationHrs} hrs`;
                  const cancellable = session.hasUpcoming && !session.allCancelled;
                  const menuIsOpen =
                    menuOpen?.courtId === courtGroup.courtId && menuOpen?.startTime === session.start_time;

                  return (
                    <div
                      key={key}
                      style={{
                        backgroundColor: "#f9fafb",
                        borderRadius: "0.5rem",
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: isMobile ? "0.75rem 1rem" : "0.875rem 1rem",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>
                            {timeRange}
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>({hrsLabel})</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <button
                            type="button"
                            onClick={() => onToggleSession(courtGroup.courtId, session.start_time)}
                            style={{
                              padding: isMobile ? "0.5rem 0.75rem" : "0.4rem 0.6rem",
                              minHeight: isMobile ? 44 : 36,
                              fontSize: "0.8rem",
                              color: "#6b7280",
                              backgroundColor: "transparent",
                              border: "none",
                              cursor: "pointer",
                              borderRadius: "0.25rem",
                            }}
                          >
                            {isSessionExpanded ? "Hide details" : "View details"}
                          </button>
                          {cancellable && (
                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (menuIsOpen) {
                                    onMenuOpen(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    onMenuOpen({
                                      courtId: courtGroup.courtId,
                                      startTime: session.start_time,
                                      courtName: courtGroup.courtName,
                                      session,
                                      anchorRect: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left },
                                    });
                                  }
                                }}
                                style={{
                                  padding: isMobile ? "0.5rem 0.75rem" : "0.4rem 0.6rem",
                                  minWidth: isMobile ? 44 : 36,
                                  minHeight: isMobile ? 44 : 36,
                                  fontSize: "1.1rem",
                                  color: "#6b7280",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  borderRadius: "0.25rem",
                                }}
                                aria-label="Manage booking"
                              >
                                ⋯
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {isSessionExpanded && (
                        <div
                          style={{
                            borderTop: "1px solid #e5e7eb",
                            padding: "0.75rem 1rem",
                            backgroundColor: "#fff",
                          }}
                        >
                          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                            Individual slots
                          </div>
                          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem", color: "#374151" }}>
                            {session.bookings.map((b) => (
                              <li key={b.id} style={{ marginBottom: "0.25rem" }}>
                                {formatTime(b.start_time)} – {formatTime(b.end_time)}
                                {b.id && (
                                  <span style={{ marginLeft: "0.5rem", color: "#9ca3af", fontFamily: "monospace" }}>
                                    #{b.id}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
