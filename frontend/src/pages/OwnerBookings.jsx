import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import OwnerLayout from "../components/OwnerLayout";
import EmptyState from "../components/EmptyState";

export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [viewMode, setViewMode] = useState("schedule"); // 'schedule', 'grouped', or 'calendar'
  const [filter, setFilter] = useState("all"); // 'all', 'upcoming', 'today', 'cancelled'
  const [dateFilter, setDateFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date()); // For calendar
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD for schedule grid
  const [courtAvailabilities, setCourtAvailabilities] = useState({}); // { courtId: [{ day_of_week, open_time, close_time }] }
  const [collapsedScheduleCourts, setCollapsedScheduleCourts] = useState(new Set()); // court IDs that are collapsed in schedule view
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [selectedBooking, setSelectedBooking] = useState(null); // For detail modal
  const [scheduleBookingModal, setScheduleBookingModal] = useState(null); // { booking, slot, shuttlecockCount } for schedule grid card click
  const [startingSessionId, setStartingSessionId] = useState(null); // booking id while PATCH start session in progress
  const [completingSessionId, setCompletingSessionId] = useState(null); // booking id while PATCH end session in progress
  const [savingShuttlecockId, setSavingShuttlecockId] = useState(null); // booking id while PATCH shuttlecock only
  const [markingPaidId, setMarkingPaidId] = useState(null); // booking id while PATCH payment_status in progress
  const [shuttlecockPrice, setShuttlecockPrice] = useState(null); // global price per shuttlecock (from /config)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let url = "/owner/bookings";
      const params = [];

      // Schedule grid view: always load by selected date
      if (viewMode === "schedule") {
        params.push(`date=${scheduleDate}`);
      } else {
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
      }

      if (params.length > 0) {
        url += "?" + params.join("&");
      }

      const res = await api.get(url);
      // API Resources wrap in { data: [...] }
      setBookings(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err) {
      console.error(err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, dateFilter, viewMode, scheduleDate]);

  const loadCourts = useCallback(async () => {
    try {
      const res = await api.get("/courts");
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setCourts(list);
      // Load availability for each court (for schedule grid)
      const availMap = {};
      await Promise.all(
        list.map(async (court) => {
          try {
            const avRes = await api.get(`/owner/courts/${court.id}/availability`);
            const avList = Array.isArray(avRes.data) ? avRes.data : (avRes.data?.data ?? []);
            availMap[court.id] = avList;
          } catch {
            availMap[court.id] = [];
          }
        })
      );
      setCourtAvailabilities(availMap);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const res = await api.get("/config");
      const price = res.data?.shuttlecock_price;
      setShuttlecockPrice(typeof price === "number" && price >= 0 ? price : null);
    } catch {
      setShuttlecockPrice(null);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadCourts();
    loadConfig();
  }, [loadBookings, loadCourts, loadConfig]);

  // Auto-expand today and upcoming dates on load
  useEffect(() => {
    if (bookings.length > 0 && viewMode === "grouped") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let bookingsToGroup = bookings;
      if (courtFilter !== "all") {
        bookingsToGroup = bookings.filter((booking) => booking.court?.id === parseInt(courtFilter));
      }
      
      const expanded = new Set();
      const grouped = groupBookingsByDate(bookingsToGroup);
      Object.keys(grouped).forEach((dateStr) => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        if (date >= today) {
          expanded.add(dateStr);
        }
      });
      setExpandedDates(expanded);
    }
  }, [bookings, viewMode, courtFilter]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      setCancellingId(bookingId);
      await api.delete(`/bookings/${bookingId}`);
      toast.success("Booking cancelled successfully");
      await loadBookings();
      setSelectedBooking(null);
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

  // "08:00" -> "8:00 AM" for schedule grid display
  const formatTime12 = (timeString) => {
    const [h, m] = (timeString || "00:00").slice(0, 5).split(":").map(Number);
    const hour = h % 12 || 12;
    const ampm = h < 12 ? "AM" : "PM";
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  // Generate hourly slots for a court on a date from its availability (day_of_week)
  const getSlotsForCourtOnDate = useCallback(
    (courtId, dateStr) => {
      const avails = courtAvailabilities[courtId] || [];
      const date = new Date(dateStr + "T12:00:00");
      const dayOfWeek = date.getDay();
      const forDay = avails.find((a) => a.day_of_week === dayOfWeek);
      if (!forDay) return [];
      const slots = [];
      const [openH, openM] = forDay.open_time.slice(0, 5).split(":").map(Number);
      const [closeH, closeM] = forDay.close_time.slice(0, 5).split(":").map(Number);
      const openMin = openH * 60 + openM;
      const closeMin = closeH * 60 + closeM;
      if (closeMin <= openMin) return [];
      for (let t = openMin; t < closeMin; t += 60) {
        const h = Math.floor(t / 60);
        const m = t % 60;
        const endMin = t + 60;
        const endH = Math.floor(endMin / 60);
        const endM = endMin % 60;
        slots.push({
          start: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
        });
      }
      return slots;
    },
    [courtAvailabilities]
  );

  const slotOverlapsBooking = (slot, booking) => {
    return slot.start < (booking.end_time || "").slice(0, 5) && slot.end > (booking.start_time || "").slice(0, 5);
  };

  const getBookingForSlot = (slot, courtBookings) => {
    return courtBookings.find((b) => slotOverlapsBooking(slot, b)) || null;
  };

  const isUpcoming = (booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate >= today && booking.status === "confirmed";
  };

  const isToday = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  // True if the booking's slot (date + end_time) has passed
  const isSlotEnded = (booking) => {
    if (!booking?.date || !booking?.end_time) return false;
    const endStr = (booking.end_time || "").slice(0, 5);
    const endAt = new Date(booking.date + "T" + endStr);
    return endAt <= new Date();
  };

  const getBookingDisplayStatus = (booking) => {
    if (booking.status === "cancelled") return { label: "Cancelled", bg: "#fee2e2", color: "#b91c1c" };
    if (booking.started_at && booking.status === "confirmed") {
      const isCompleted = booking.ended_at || isSlotEnded(booking);
      if (isCompleted) return { label: "Completed", bg: "#f3f4f6", color: "#6b7280" };
      return { label: "Playing", bg: "#dbeafe", color: "#1d4ed8" };
    }
    if (booking.status === "confirmed") return { label: "Confirmed", bg: "#dcfce7", color: "#166534" };
    return { label: booking.status, bg: "#f3f4f6", color: "#6b7280" };
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
    // Convert to array and sort by court name
    return Object.values(grouped)
      .map((group) => ({
        ...group,
        bookings: group.bookings.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      }))
      .sort((a, b) => a.courtName.localeCompare(b.courtName));
  };

  const groupBookingsByPlayer = (bookingsList) => {
    const grouped = {};
    bookingsList.forEach((booking) => {
      const userId = booking.user?.id || "unknown";
      const userName = booking.user?.name || "Guest";
      const userEmail = booking.user?.email || "";
      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          userName,
          userEmail,
          bookings: [],
        };
      }
      grouped[userId].bookings.push(booking);
    });
    // Convert to array and sort by player name, then by first booking time
    return Object.values(grouped)
      .map((group) => ({
        ...group,
        bookings: group.bookings.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      }))
      .sort((a, b) => {
        const nameCompare = a.userName.localeCompare(b.userName);
        if (nameCompare !== 0) return nameCompare;
        return a.bookings[0].start_time.localeCompare(b.bookings[0].start_time);
      });
  };

  const getBookingsForDate = (dateStr) => {
    return bookings.filter((b) => b.date === dateStr && b.status !== "cancelled");
  };

  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    if (courtFilter !== "all") {
      filtered = filtered.filter((booking) => booking.court?.id === parseInt(courtFilter));
    }
    return filtered;
  }, [bookings, courtFilter]);

  const groupedBookings = useMemo(() => {
    const grouped = groupBookingsByDate(filteredBookings);
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      if (filter === "upcoming" || filter === "today") {
        return dateA - dateB;
      }
      if (filter === "cancelled") {
        return dateB - dateA;
      }
      // For 'all', show upcoming first, then past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isAUpcoming = dateA >= today;
      const isBUpcoming = dateB >= today;
      
      if (isAUpcoming && !isBUpcoming) return -1;
      if (!isAUpcoming && isBUpcoming) return 1;
      
      return isAUpcoming ? dateA - dateB : dateB - dateA;
    });

    return sortedDates.map((dateStr) => {
      const dateBookings = grouped[dateStr];
      const courts = groupBookingsByCourt(dateBookings);
      // For each court, group bookings by player
      const courtsWithPlayers = courts.map((court) => ({
        ...court,
        players: groupBookingsByPlayer(court.bookings),
      }));
      return {
        key: dateStr,
        label: formatDateShort(dateStr),
        fullLabel: formatDate(dateStr),
        bookings: dateBookings,
        courts: courtsWithPlayers,
      };
    });
  }, [filteredBookings, filter]);

  const toggleDate = (key) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDates(newExpanded);
  };

  const jumpToToday = () => {
    if (viewMode === "grouped") {
      const today = new Date().toISOString().slice(0, 10);
      const todayGroup = groupedBookings.find((group) => group.key === today);
      
      if (todayGroup) {
        const newExpanded = new Set(expandedDates);
        newExpanded.add(today);
        setExpandedDates(newExpanded);
        
        setTimeout(() => {
          const element = document.getElementById(`group-card-${today}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    }
  };

  // Calendar helpers
  const getCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // Format date string manually to avoid timezone issues with toISOString()
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayBookings = getBookingsForDate(dateStr);
      days.push({
        date,
        dateStr,
        day,
        bookings: dayBookings,
        count: dayBookings.length,
      });
    }

    return days;
  };

  // Schedule Grid View: group by court, fixed time slots, date picker
  const ScheduleGridView = () => {
    const scheduleDateStr = scheduleDate;
    const courtsToShow =
      courtFilter === "all" ? courts : courts.filter((c) => c.id === parseInt(courtFilter, 10));
    const bookingsForDate = bookings; // API already returns bookings for scheduleDate in schedule mode

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Date control */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "1rem",
            padding: "1rem 1.25rem",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
          }}
        >
          <label
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#374151",
            }}
          >
            Date
          </label>
          <input
            type="date"
            value={scheduleDateStr}
            onChange={(e) => setScheduleDate(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.9rem",
            }}
          />
          <button
            onClick={() => setScheduleDate(new Date().toISOString().slice(0, 10))}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            Today
          </button>
          <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>
            {formatDate(scheduleDateStr)}
          </span>
        </div>

        {/* One section per court */}
        {courtsToShow.map((court) => {
          const slots = getSlotsForCourtOnDate(court.id, scheduleDateStr);
          const courtBookings = bookingsForDate.filter((b) => b.court?.id === court.id);
          const isExpanded = !collapsedScheduleCourts.has(court.id);
          const toggleCourt = () => {
            setCollapsedScheduleCourts((prev) => {
              const next = new Set(prev);
              if (next.has(court.id)) next.delete(court.id);
              else next.add(court.id);
              return next;
            });
          };

          return (
            <div
              key={court.id}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "0.75rem",
                border: "1px solid #e5e7eb",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={toggleCourt}
                style={{
                  width: "100%",
                  margin: 0,
                  padding: isMobile ? "1rem" : "1.25rem 1.5rem",
                  fontSize: isMobile ? "1.1rem" : "1.25rem",
                  fontWeight: 600,
                  color: "#111827",
                  border: "none",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textAlign: "left",
                }}
              >
                <span>{court.name}</span>
                <span
                  style={{
                    fontSize: "1rem",
                    color: "#6b7280",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  ▼
                </span>
              </button>
              {isExpanded && (
              <>
              {slots.length === 0 ? (
                <p
                  style={{
                    padding: "1.5rem",
                    color: "#6b7280",
                    fontSize: "0.9rem",
                    margin: 0,
                  }}
                >
                  No availability set for this day. Set schedule in Court Schedule.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      tableLayout: "fixed",
                      borderCollapse: "collapse",
                      minWidth: "320px",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb" }}>
                        <th
                          style={{
                            padding: isMobile ? "0.75rem" : "1rem",
                            textAlign: "left",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "#374151",
                            width: "28%",
                            minWidth: "140px",
                          }}
                        >
                          Time
                        </th>
                        <th
                          style={{
                            padding: isMobile ? "0.75rem" : "1rem",
                            textAlign: "left",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "#374151",
                            width: "72%",
                          }}
                        >
                        
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot) => {
                        const booking = getBookingForSlot(slot, courtBookings);
                        return (
                          <tr
                            key={`${slot.start}-${slot.end}`}
                            style={{
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            <td
                              style={{
                                padding: isMobile ? "0.75rem" : "1rem",
                                fontSize: "0.9rem",
                                color: "#374151",
                                verticalAlign: "middle",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatTime12(slot.start)} – {formatTime12(slot.end)}
                            </td>
                            <td
                              style={{
                                padding: isMobile ? "0.75rem" : "1rem",
                                verticalAlign: "middle",
                                width: "72%",
                              }}
                            >
                              {booking ? (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setScheduleBookingModal({ booking, slot, shuttlecockCount: booking.shuttlecock_count ?? "" })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setScheduleBookingModal({ booking, slot, shuttlecockCount: booking.shuttlecock_count ?? "" });
                                    }
                                  }}
                                  style={{
                                    padding: "0.75rem 1rem",
                                    backgroundColor: booking.status === "cancelled" ? "#fef2f2" : "#f0fdf4",
                                    border: `1px solid ${booking.status === "cancelled" ? "#fecaca" : "#bbf7d0"}`,
                                    borderRadius: "0.5rem",
                                    width: "100%",
                                    boxSizing: "border-box",
                                    cursor: "pointer",
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.25rem" }}>
                                    {booking.user?.name || "Guest"}
                                  </div>
                                  <div
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {(() => {
                                      const statusStyle = getBookingDisplayStatus(booking);
                                      return (
                                        <span
                                          style={{
                                            padding: "0.2rem 0.5rem",
                                            borderRadius: "999px",
                                            fontSize: "0.75rem",
                                            fontWeight: 500,
                                            backgroundColor: statusStyle.bg,
                                            color: statusStyle.color,
                                          }}
                                        >
                                          {statusStyle.label}
                                        </span>
                                      );
                                    })()}
                                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                                      {booking.payment_status === "paid" ? "Paid full" : "Reserved"}
                                    </span>
                                    {isUpcoming(booking) && booking.status !== "cancelled" && !booking.started_at && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancel(booking.id);
                                        }}
                                        disabled={cancellingId === booking.id}
                                        style={{
                                          padding: "0.2rem 0.5rem",
                                          backgroundColor: "#fee2e2",
                                          color: "#991b1b",
                                          border: "1px solid #fecaca",
                                          borderRadius: "0.25rem",
                                          cursor: cancellingId === booking.id ? "not-allowed" : "pointer",
                                          fontSize: "0.75rem",
                                          opacity: cancellingId === booking.id ? 0.6 : 1,
                                        }}
                                        title="Cancel booking"
                                      >
                                        {cancellingId === booking.id ? "..." : "Cancel"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Available</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Grouped by Date View Component
  const GroupedByDateView = () => {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {groupedBookings.map((group) => {
          const isExpanded = expandedDates.has(group.key);
          const isDateToday = isToday(group.key);
          const isDateUpcoming = group.bookings.some((b) => isUpcoming(b));
          // const isDatePast = !isDateUpcoming && !isDateToday;

          return (
            <div
              key={group.key}
              id={`group-card-${group.key}`}
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
                onClick={() => toggleDate(group.key)}
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
                    {group.label}
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
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {group.bookings.length} {group.bookings.length === 1 ? "booking" : "bookings"}
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
                    padding: "0 1.5rem 1.5rem 1.5rem",
                    borderTop: "1px solid #e5e7eb",
                    marginTop: "0.5rem",
                    paddingTop: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem",
                    }}
                  >
                    {group.courts?.map((courtGroup) => (
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
                        <h3
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            color: "#111827",
                            margin: "0 0 0.75rem 0",
                            paddingBottom: "0.75rem",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          {courtGroup.courtName}
                        </h3>

                        {/* Players within this court */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.75rem",
                          }}
                        >
                          {courtGroup.players?.map((playerGroup) => {
                            const playerBookings = playerGroup.bookings;
                            // const hasUpcoming = playerBookings.some((b) => isUpcoming(b) && b.status !== "cancelled");
                            const hasCancelled = playerBookings.some((b) => b.status === "cancelled");
                            const allCancelled = playerBookings.every((b) => b.status === "cancelled");

                            return (
                              <div
                                key={playerGroup.userId}
                                style={{
                                  padding: isMobile ? "0.5rem" : "0.75rem",
                                  backgroundColor: "#ffffff",
                                  borderRadius: "0.375rem",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {/* Player Header */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    marginBottom: "0.5rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.95rem",
                                      fontWeight: 600,
                                      color: "#111827",
                                    }}
                                  >
                                    {playerGroup.userName}
                                  </span>
                                  {playerGroup.userEmail && (
                                    <span
                                      style={{
                                        fontSize: "0.85rem",
                                        color: "#6b7280",
                                      }}
                                    >
                                      ({playerGroup.userEmail})
                                    </span>
                                  )}
                                  {hasCancelled && !allCancelled && (
                                    <span
                                      style={{
                                        padding: "0.15rem 0.5rem",
                                        backgroundColor: "#fee2e2",
                                        color: "#991b1b",
                                        borderRadius: "999px",
                                        fontSize: "0.7rem",
                                        fontWeight: 500,
                                      }}
                                    >
                                      Some Cancelled
                                    </span>
                                  )}
                                  {allCancelled && (
                                    <span
                                      style={{
                                        padding: "0.15rem 0.5rem",
                                        backgroundColor: "#fee2e2",
                                        color: "#991b1b",
                                        borderRadius: "999px",
                                        fontSize: "0.7rem",
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
                                  {/* Group time slots by status */}
                                  {(() => {
                                    const upcomingSlots = playerBookings.filter(
                                      (b) => isUpcoming(b) && b.status !== "cancelled"
                                    );
                                    const cancelledSlots = playerBookings.filter((b) => b.status === "cancelled");
                                    const pastSlots = playerBookings.filter(
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
                                                  fontSize: "0.8rem",
                                                  color: "#6b7280",
                                                  fontWeight: 500,
                                                  marginRight: "0.25rem",
                                                }}
                                              >
                                                {isMobile ? "Times:" : "Time slots:"}
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
                                                      fontSize: "0.85rem",
                                                      color: "#111827",
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                                  </span>
                                                  {isUpcoming(booking) && booking.status !== "cancelled" && !booking.started_at && (
                                                    <button
                                                      onClick={() => handleCancel(booking.id)}
                                                      disabled={cancellingId === booking.id}
                                                      style={{
                                                        padding: "0.2rem 0.4rem",
                                                        backgroundColor: "#fee2e2",
                                                        color: "#991b1b",
                                                        border: "1px solid #fecaca",
                                                        borderRadius: "0.25rem",
                                                        cursor: cancellingId === booking.id ? "not-allowed" : "pointer",
                                                        fontWeight: 500,
                                                        fontSize: "0.7rem",
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
                                                  fontSize: "0.8rem",
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
                                                    fontSize: "0.85rem",
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
                                                  fontSize: "0.8rem",
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
                                                    fontSize: "0.85rem",
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Calendar View Component
  const CalendarView = () => {
    const calendarDays = getCalendarDays();
    const monthName = selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    const navigateMonth = (direction) => {
      const newDate = new Date(selectedDate);
      newDate.setMonth(selectedDate.getMonth() + direction);
      setSelectedDate(newDate);
    };

    return (
      <div>
        {/* Calendar Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            padding: "1rem",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
          }}
        >
          <button
            onClick={() => navigateMonth(-1)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f3f4f6",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ← Prev
          </button>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111827", margin: 0 }}>
            {monthName}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f3f4f6",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Next →
          </button>
        </div>

        {/* Calendar Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: isMobile ? "0.25rem" : "0.5rem",
            backgroundColor: "#ffffff",
            padding: isMobile ? "0.5rem" : "1rem",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            overflowX: "auto",
          }}
        >
          {/* Day Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              style={{
                padding: isMobile ? "0.5rem 0.25rem" : "0.75rem",
                textAlign: "center",
                fontWeight: 600,
                color: "#6b7280",
                fontSize: isMobile ? "0.75rem" : "0.9rem",
              }}
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((dayData, index) => {
            if (!dayData) {
              return <div key={`empty-${index}`} style={{ minHeight: "100px" }} />;
            }

            const { dateStr, day, bookings: dayBookings, count } = dayData;
            const isTodayDate = isToday(dateStr);
            const isPast = new Date(dateStr) < new Date().setHours(0, 0, 0, 0);

            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (dayBookings.length > 0) {
                    setSelectedBooking({ date: dateStr, bookings: dayBookings });
                  }
                }}
                style={{
                  minHeight: isMobile ? "60px" : "100px",
                  padding: isMobile ? "0.25rem" : "0.5rem",
                  border: `2px solid ${isTodayDate ? "#2563eb" : "#e5e7eb"}`,
                  borderRadius: "0.5rem",
                  backgroundColor: isTodayDate ? "#eff6ff" : "#ffffff",
                  cursor: dayBookings.length > 0 ? "pointer" : "default",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (dayBookings.length > 0) {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                    e.currentTarget.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isTodayDate ? "#eff6ff" : "#ffffff";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: isTodayDate ? 600 : 500,
                    color: isPast ? "#9ca3af" : "#111827",
                    marginBottom: "0.25rem",
                  }}
                >
                  {day}
                </div>
                {count > 0 && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#2563eb",
                      fontWeight: 600,
                      backgroundColor: "#dbeafe",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      display: "inline-block",
                      marginTop: "0.25rem",
                    }}
                  >
                    {count} {count === 1 ? "booking" : "bookings"}
                  </div>
                )}
                {dayBookings.length > 0 && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "#6b7280" }}>
                    {dayBookings.slice(0, 2).map((b) => (
                      <div key={b.id} style={{ marginBottom: "0.25rem" }}>
                        {formatTime(b.start_time)} - {b.court?.name}
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div style={{ color: "#9ca3af" }}>+{dayBookings.length - 2} more</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
      <div style={{ marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          All Bookings
        </h1>
        <p style={{ color: "#6b7280", fontSize: isMobile ? "0.9rem" : "1rem" }}>
          View and manage bookings across all your courts
        </p>
      </div>

      {/* View Mode Toggle */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          padding: isMobile ? "0.5rem" : "0.75rem",
          backgroundColor: "#f9fafb",
          borderRadius: "0.5rem",
          border: "1px solid #e5e7eb",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: isMobile ? "0.85rem" : "0.9rem", fontWeight: 500, color: "#374151", alignSelf: "center", width: isMobile ? "100%" : "auto" }}>
          View:
        </span>
        {[
          { key: "schedule", label: "📋 Schedule", desc: "By court & time" },
          { key: "grouped", label: "📅 Group by Date", desc: "Expandable date cards" },
          { key: "calendar", label: "📆 Calendar", desc: "Monthly overview" },
        ].map((view) => (
          <button
            key={view.key}
            onClick={() => setViewMode(view.key)}
            style={{
              padding: isMobile ? "0.5rem 0.75rem" : "0.75rem 1.25rem",
              backgroundColor: viewMode === view.key ? "#2563eb" : "#ffffff",
              color: viewMode === view.key ? "#ffffff" : "#374151",
              border: `1px solid ${viewMode === view.key ? "#2563eb" : "#d1d5db"}`,
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: viewMode === view.key ? 600 : 500,
              fontSize: isMobile ? "0.85rem" : "0.9rem",
              display: "flex",
              flexDirection: isMobile ? "row" : "column",
              alignItems: "center",
              gap: "0.25rem",
              flex: isMobile ? 1 : "none",
            }}
            title={view.desc}
          >
            <span>{view.label}</span>
            {!isMobile && <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{view.desc}</span>}
          </button>
        ))}
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
            overflowX: isMobile ? "auto" : "visible",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
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
                padding: isMobile ? "0.5rem 1rem" : "0.75rem 1.5rem",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: filter === tab.key ? "2px solid #2563eb" : "2px solid transparent",
                color: filter === tab.key ? "#2563eb" : "#6b7280",
                fontWeight: filter === tab.key ? 600 : 500,
                cursor: "pointer",
                fontSize: isMobile ? "0.85rem" : "0.95rem",
                marginBottom: "-2px",
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

        {/* Quick Filters */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {viewMode === "grouped" && (
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
          )}
          
          <select
            value={courtFilter}
            onChange={(e) => setCourtFilter(e.target.value)}
            style={{
              padding: isMobile ? "0.5rem 0.5rem" : "0.5rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              fontSize: isMobile ? "0.85rem" : "0.9rem",
              backgroundColor: "#ffffff",
              flex: isMobile ? 1 : "none",
              minWidth: isMobile ? "120px" : "auto",
            }}
          >
            <option value="all">All Courts</option>
            {courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>

          {viewMode === "grouped" && (
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setFilter("all");
              }}
              style={{
                padding: isMobile ? "0.5rem 0.5rem" : "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                fontSize: isMobile ? "0.85rem" : "0.9rem",
                flex: isMobile ? 1 : "none",
                minWidth: isMobile ? "140px" : "auto",
              }}
            />
          )}

          {(dateFilter || courtFilter !== "all") && (
            <button
              onClick={() => {
                setDateFilter("");
                setCourtFilter("all");
              }}
              style={{
                padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 0.75rem",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontSize: isMobile ? "0.8rem" : "0.85rem",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Clear Filters
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
      ) : viewMode === "schedule" && courts.length === 0 ? (
        <EmptyState
          title="No courts yet"
          message="Add courts and set their schedules in My Courts to see the schedule grid here."
          actionLabel="Go to My Courts"
          actionTo="/owner/courts"
        />
      ) : viewMode === "schedule" ? (
        <ScheduleGridView />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          title={
            filter === "today"
              ? "No bookings for today"
              : filter === "upcoming"
              ? "No upcoming bookings"
              : filter === "cancelled"
              ? "No cancelled bookings"
              : dateFilter
              ? "No bookings for this date"
              : courtFilter !== "all"
              ? "No bookings for this court"
              : "No bookings yet"
          }
          message={
            filter === "today"
              ? "Bookings for today will appear here once players book."
              : filter === "upcoming"
              ? "Upcoming bookings will show here."
              : filter === "cancelled"
              ? "Cancelled bookings will appear here."
              : dateFilter
              ? "Try another date or view All."
              : courtFilter !== "all"
              ? "Try another court or view All."
              : "Bookings will appear here once players reserve courts."
          }
        />
      ) : (
        <>
          {viewMode === "grouped" && <GroupedByDateView />}
          {viewMode === "calendar" && <CalendarView />}
        </>
      )}

      {/* Schedule grid: booking detail modal (shuttlecock, start session) */}
      {scheduleBookingModal && (
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
            zIndex: 1001,
            padding: isMobile ? "0.5rem" : "1rem",
          }}
          onClick={() => setScheduleBookingModal(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: isMobile ? "1rem" : "1.5rem",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: isMobile ? "1.2rem" : "1.35rem", fontWeight: 600, color: "#111827", margin: 0 }}>
                Booking details
              </h2>
              <button
                type="button"
                onClick={() => setScheduleBookingModal(null)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#6b7280" }}
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.25rem" }}>
                {scheduleBookingModal.booking.user?.name || "Guest"}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                {scheduleBookingModal.booking.court?.name} · {formatTime12(scheduleBookingModal.slot.start)} – {formatTime12(scheduleBookingModal.slot.end)}
              </div>
              <div style={{ display: "flex", alignItems: "center", marginTop: "0.25rem" }}>
                {(() => {
                  const statusStyle = getBookingDisplayStatus(scheduleBookingModal.booking);
                  return (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color,
                      }}
                    >
                      {statusStyle.label}
                    </span>
                  );
                })()}
              </div>
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem" }}>
                Payment
              </label>
              {scheduleBookingModal.booking.payment_status === "paid" ? (
                <span style={{ fontSize: "0.9rem", color: "#166534", fontWeight: 500 }}>Paid full</span>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>Reservation fee only</span>
                  {(() => {
                    const b = scheduleBookingModal.booking;
                    const court = courts.find((c) => c.id === b.court?.id);
                    const hourlyRate = court?.hourly_rate != null ? parseFloat(court.hourly_rate) : 0;
                    const pct = court?.reservation_fee_percentage != null ? parseFloat(court.reservation_fee_percentage) : 0;
                    const start = (b.start_time || "").slice(0, 5);
                    const end = (b.end_time || "").slice(0, 5);
                    let remainingBalance = 0;
                    if (hourlyRate > 0 && start && end) {
                      const [sh, sm] = start.split(":").map(Number);
                      const [eh, em] = end.split(":").map(Number);
                      const durationHours = eh - sh + (em - sm) / 60;
                      const total = durationHours * hourlyRate;
                      const reservationFee = total * (pct / 100);
                      remainingBalance = Math.max(0, total - reservationFee);
                    }
                    return remainingBalance > 0 ? (
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "#374151",
                          padding: "0.5rem 0.75rem",
                          backgroundColor: "#fef3c7",
                          borderRadius: "0.375rem",
                          border: "1px solid #fde68a",
                        }}
                      >
                        <strong>Remaining balance: ₱{remainingBalance.toFixed(2)}</strong>
                        <span style={{ display: "block", marginTop: "0.25rem", color: "#92400e", fontSize: "0.8rem" }}>
                          To be collected from the player at time of play.
                        </span>
                      </div>
                    ) : null;
                  })()}
                  <button
                    type="button"
                    disabled={markingPaidId === scheduleBookingModal.booking.id}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "You are confirming that the player is fully paid. Do you want to continue?"
                        )
                      ) {
                        return;
                      }
                      const id = scheduleBookingModal.booking.id;
                      setMarkingPaidId(id);
                      try {
                        await api.patch(`/owner/bookings/${id}`, { payment_status: "paid" });
                        setScheduleBookingModal((prev) =>
                          prev ? { ...prev, booking: { ...prev.booking, payment_status: "paid" } } : null
                        );
                        loadBookings();
                      } catch (err) {
                        console.error(err);
                        toast.error(err?.response?.data?.message || "Failed to update payment. Please try again.");
                      } finally {
                        setMarkingPaidId(null);
                      }
                    }}
                    style={{
                      padding: "0.4rem 0.75rem",
                      backgroundColor: markingPaidId === scheduleBookingModal.booking.id ? "#9ca3af" : "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      cursor: markingPaidId === scheduleBookingModal.booking.id ? "not-allowed" : "pointer",
                      opacity: markingPaidId === scheduleBookingModal.booking.id ? 0.8 : 1,
                    }}
                  >
                    {markingPaidId === scheduleBookingModal.booking.id ? "Updating…" : "Is payment settled?"}
                  </button>
                </div>
              )}
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem" }}>
                Shuttlecock count
              </label>
              <input
                type="number"
                min={0}
                value={scheduleBookingModal.shuttlecockCount}
                onChange={(e) =>
                  setScheduleBookingModal((prev) => (prev ? { ...prev, shuttlecockCount: e.target.value } : null))
                }
                placeholder="e.g. 2"
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
              />
              {(() => {
                const raw = scheduleBookingModal.shuttlecockCount;
                const count = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
                const validCount = Number.isNaN(count) || count < 0 ? 0 : count;
                const price = shuttlecockPrice != null && shuttlecockPrice >= 0 ? shuttlecockPrice : null;
                const savedCost = scheduleBookingModal.booking.shuttlecock_cost;
                const displayCost = savedCost != null ? savedCost : (validCount > 0 && price != null ? validCount * price : null);
                if (validCount <= 0 && displayCost == null) return null;
                return (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.875rem",
                      color: "#374151",
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "0.375rem",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    <strong>Additional payment (shuttlecocks):</strong> ₱{(displayCost ?? 0).toFixed(2)}
                    {savedCost != null && (
                      <span style={{ display: "block", marginTop: "0.25rem", color: "#166534", fontSize: "0.8rem" }}>
                        Saved — to be collected from the player.
                      </span>
                    )}
                    {savedCost == null && validCount > 0 && price != null && (
                      <span style={{ display: "block", marginTop: "0.25rem", color: "#166534", fontSize: "0.8rem" }}>
                        {validCount} × ₱{price.toFixed(2)} each — click Save to persist. To be collected from the player.
                      </span>
                    )}
                  </div>
                );
              })()}
              <button
                type="button"
                disabled={savingShuttlecockId === scheduleBookingModal.booking.id}
                onClick={async () => {
                  const id = scheduleBookingModal.booking.id;
                  const raw = scheduleBookingModal.shuttlecockCount;
                  const parsed = raw === "" ? NaN : parseInt(raw, 10);
                  const shuttlecockCount = Number.isNaN(parsed) || parsed < 0 ? null : parsed;
                  setSavingShuttlecockId(id);
                  try {
                    const res = await api.patch(`/owner/bookings/${id}`, { shuttlecock_count: shuttlecockCount });
                    const updated = res.data?.data ?? res.data;
                    setScheduleBookingModal((prev) =>
                      prev && prev.booking.id === id
                        ? { ...prev, booking: { ...prev.booking, ...updated }, shuttlecockCount: updated?.shuttlecock_count ?? prev.shuttlecockCount }
                        : null
                    );
                    loadBookings();
                    toast.success("Shuttlecock count saved.");
                  } catch (err) {
                    console.error(err);
                    toast.error(err?.response?.data?.message || "Failed to save shuttlecock count.");
                  } finally {
                    setSavingShuttlecockId(null);
                  }
                }}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.4rem 0.75rem",
                  backgroundColor: savingShuttlecockId === scheduleBookingModal.booking.id ? "#9ca3af" : "#0ea5e9",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: savingShuttlecockId === scheduleBookingModal.booking.id ? "not-allowed" : "pointer",
                  opacity: savingShuttlecockId === scheduleBookingModal.booking.id ? 0.8 : 1,
                }}
              >
                {savingShuttlecockId === scheduleBookingModal.booking.id ? "Saving…" : "Save shuttlecock count"}
              </button>
            </div>
            {scheduleBookingModal.booking.status === "confirmed" && !scheduleBookingModal.booking.started_at && (
              <button
                type="button"
                disabled={startingSessionId === scheduleBookingModal.booking.id}
                onClick={async () => {
                  const id = scheduleBookingModal.booking.id;
                  const raw = scheduleBookingModal.shuttlecockCount;
                  const parsed = raw === "" ? NaN : parseInt(raw, 10);
                  const shuttlecockCount = Number.isNaN(parsed) || parsed < 0 ? null : parsed;
                  setStartingSessionId(id);
                  try {
                    await api.patch(`/owner/bookings/${id}`, {
                      shuttlecock_count: shuttlecockCount,
                      start_session: true,
                    });
                    setScheduleBookingModal(null);
                    loadBookings();
                  } catch (err) {
                    console.error(err);
                    toast.error(err?.response?.data?.message || "Failed to start session. Please try again.");
                  } finally {
                    setStartingSessionId(null);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "0.6rem 1rem",
                  backgroundColor: startingSessionId === scheduleBookingModal.booking.id ? "#9ca3af" : "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: startingSessionId === scheduleBookingModal.booking.id ? "not-allowed" : "pointer",
                  opacity: startingSessionId === scheduleBookingModal.booking.id ? 0.8 : 1,
                }}
              >
                {startingSessionId === scheduleBookingModal.booking.id ? "Starting…" : "Start session"}
              </button>
            )}
            {scheduleBookingModal.booking.status === "confirmed" &&
              scheduleBookingModal.booking.started_at &&
              !scheduleBookingModal.booking.ended_at && (
              <button
                type="button"
                disabled={completingSessionId === scheduleBookingModal.booking.id}
                onClick={async () => {
                  const id = scheduleBookingModal.booking.id;
                  const raw = scheduleBookingModal.shuttlecockCount;
                  const parsed = raw === "" ? NaN : parseInt(raw, 10);
                  const shuttlecockCount = Number.isNaN(parsed) || parsed < 0 ? null : parsed;
                  setCompletingSessionId(id);
                  try {
                    await api.patch(`/owner/bookings/${id}`, {
                      shuttlecock_count: shuttlecockCount,
                      end_session: true,
                    });
                    setScheduleBookingModal((prev) =>
                      prev ? { ...prev, booking: { ...prev.booking, ended_at: new Date().toISOString() } } : null
                    );
                    loadBookings();
                  } catch (err) {
                    console.error(err);
                    toast.error(err?.response?.data?.message || "Failed to complete session. Please try again.");
                  } finally {
                    setCompletingSessionId(null);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "0.6rem 1rem",
                  marginTop: "0.5rem",
                  backgroundColor: completingSessionId === scheduleBookingModal.booking.id ? "#9ca3af" : "#6366f1",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: completingSessionId === scheduleBookingModal.booking.id ? "not-allowed" : "pointer",
                  opacity: completingSessionId === scheduleBookingModal.booking.id ? 0.8 : 1,
                }}
              >
                {completingSessionId === scheduleBookingModal.booking.id ? "Completing…" : "Complete session"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Booking Detail Modal (calendar / list view) */}
      {selectedBooking && (
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
            padding: isMobile ? "0.5rem" : "1rem",
          }}
          onClick={() => setSelectedBooking(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: isMobile ? "1rem" : "2rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <h2 style={{ fontSize: isMobile ? "1.25rem" : "1.5rem", fontWeight: 600, color: "#111827", margin: 0 }}>
                {formatDate(selectedBooking.date)}
              </h2>
              <button
                onClick={() => setSelectedBooking(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {(() => {
                const dateBookings = selectedBooking.bookings;
                const courts = groupBookingsByCourt(dateBookings);
                const courtsWithPlayers = courts.map((court) => ({
                  ...court,
                  players: groupBookingsByPlayer(court.bookings),
                }));

                return courtsWithPlayers.map((courtGroup) => (
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
                    <h3
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 600,
                        color: "#111827",
                        margin: "0 0 0.75rem 0",
                        paddingBottom: "0.75rem",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {courtGroup.courtName}
                    </h3>

                    {/* Players within this court */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      {courtGroup.players?.map((playerGroup) => {
                        const playerBookings = playerGroup.bookings;
                        // const hasUpcoming = playerBookings.some((b) => isUpcoming(b) && b.status !== "cancelled");
                        const hasCancelled = playerBookings.some((b) => b.status === "cancelled");
                        const allCancelled = playerBookings.every((b) => b.status === "cancelled");

                        return (
                          <div
                            key={playerGroup.userId}
                            style={{
                              padding: isMobile ? "0.5rem" : "0.75rem",
                              backgroundColor: "#ffffff",
                              borderRadius: "0.375rem",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            {/* Player Header */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.5rem",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.95rem",
                                  fontWeight: 600,
                                  color: "#111827",
                                }}
                              >
                                {playerGroup.userName}
                              </span>
                              {playerGroup.userEmail && (
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "#6b7280",
                                  }}
                                >
                                  ({playerGroup.userEmail})
                                </span>
                              )}
                              {hasCancelled && !allCancelled && (
                                <span
                                  style={{
                                    padding: "0.15rem 0.5rem",
                                    backgroundColor: "#fee2e2",
                                    color: "#991b1b",
                                    borderRadius: "999px",
                                    fontSize: "0.7rem",
                                    fontWeight: 500,
                                  }}
                                >
                                  Some Cancelled
                                </span>
                              )}
                              {allCancelled && (
                                <span
                                  style={{
                                    padding: "0.15rem 0.5rem",
                                    backgroundColor: "#fee2e2",
                                    color: "#991b1b",
                                    borderRadius: "999px",
                                    fontSize: "0.7rem",
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
                              {/* Group time slots by status */}
                              {(() => {
                                const upcomingSlots = playerBookings.filter(
                                  (b) => isUpcoming(b) && b.status !== "cancelled"
                                );
                                const cancelledSlots = playerBookings.filter((b) => b.status === "cancelled");
                                const pastSlots = playerBookings.filter(
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
                                              fontSize: "0.8rem",
                                              color: "#6b7280",
                                              fontWeight: 500,
                                              marginRight: "0.25rem",
                                            }}
                                          >
                                            {isMobile ? "Times:" : "Time slots:"}
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
                                                  fontSize: "0.85rem",
                                                  color: "#111827",
                                                  fontWeight: 500,
                                                }}
                                              >
                                                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                              </span>
                                              {isUpcoming(booking) && booking.status !== "cancelled" && !booking.started_at && (
                                                <button
                                                  onClick={() => handleCancel(booking.id)}
                                                  disabled={cancellingId === booking.id}
                                                  style={{
                                                    padding: "0.2rem 0.4rem",
                                                    backgroundColor: "#fee2e2",
                                                    color: "#991b1b",
                                                    border: "1px solid #fecaca",
                                                    borderRadius: "0.25rem",
                                                    cursor: cancellingId === booking.id ? "not-allowed" : "pointer",
                                                    fontWeight: 500,
                                                    fontSize: "0.7rem",
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
                                              fontSize: "0.8rem",
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
                                                fontSize: "0.85rem",
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
                                              fontSize: "0.8rem",
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
                                                fontSize: "0.85rem",
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
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
