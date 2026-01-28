import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";
import OwnerLayout from "../components/OwnerLayout";

export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [viewMode, setViewMode] = useState("grouped"); // 'grouped' or 'calendar'
  const [filter, setFilter] = useState("all"); // 'all', 'upcoming', 'today', 'cancelled'
  const [dateFilter, setDateFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date()); // For calendar
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [selectedBooking, setSelectedBooking] = useState(null); // For detail modal

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

  const loadCourts = useCallback(async () => {
    try {
      const res = await api.get("/courts");
      setCourts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadCourts();
  }, [loadBookings, loadCourts]);

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
      await loadBookings();
      setSelectedBooking(null);
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

    return sortedDates.map((dateStr) => ({
      key: dateStr,
      label: formatDateShort(dateStr),
      fullLabel: formatDate(dateStr),
      bookings: grouped[dateStr].sort((a, b) => {
        // Sort by court name, then time
        const courtCompare = (a.court?.name || "").localeCompare(b.court?.name || "");
        if (courtCompare !== 0) return courtCompare;
        return a.start_time.localeCompare(b.start_time);
      }),
    }));
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
      const dateStr = date.toISOString().slice(0, 10);
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
          const isDatePast = !isDateUpcoming && !isDateToday;

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
                  padding: "1.25rem 1.5rem",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, flexWrap: "wrap" }}>
                  <div
                    style={{
                      fontSize: "1.5rem",
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
                      gap: "0.75rem",
                    }}
                  >
                    {group.bookings.map((booking) => {
                      const isUpcomingBooking = isUpcoming(booking);
                      const isCancelled = booking.status === "cancelled";

                      return (
                        <div
                          key={booking.id}
                          style={{
                            padding: "1rem",
                            backgroundColor: "#f9fafb",
                            borderRadius: "0.5rem",
                            border: "1px solid #e5e7eb",
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
                                  gap: "0.75rem",
                                  marginBottom: "0.5rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                <h3
                                  style={{
                                    fontSize: "1.1rem",
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
                                    fontSize: "0.8rem",
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
                              <div
                                style={{
                                  color: "#6b7280",
                                  fontSize: "0.9rem",
                                  display: "flex",
                                  gap: "1rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span>
                                  <strong>Time:</strong> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                </span>
                                <span>
                                  <strong>Player:</strong> {booking.user?.name || "Guest"}
                                  {booking.user?.email && ` (${booking.user.email})`}
                                </span>
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
                                  fontSize: "0.85rem",
                                  opacity: cancellingId === booking.id ? 0.6 : 1,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {cancellingId === booking.id ? "Cancelling..." : "Cancel"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
            gap: "0.5rem",
            backgroundColor: "#ffffff",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* Day Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              style={{
                padding: "0.75rem",
                textAlign: "center",
                fontWeight: 600,
                color: "#6b7280",
                fontSize: "0.9rem",
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

            const { date, dateStr, day, bookings: dayBookings, count } = dayData;
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
                  minHeight: "100px",
                  padding: "0.5rem",
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
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          All Bookings
        </h1>
        <p style={{ color: "#6b7280", fontSize: "1rem" }}>
          View and manage bookings across all your courts
        </p>
      </div>

      {/* View Mode Toggle */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          padding: "0.75rem",
          backgroundColor: "#f9fafb",
          borderRadius: "0.5rem",
          border: "1px solid #e5e7eb",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#374151", alignSelf: "center" }}>
          View:
        </span>
        {[
          { key: "grouped", label: "📅 Group by Date", desc: "Expandable date cards" },
          { key: "calendar", label: "📆 Calendar", desc: "Monthly overview" },
        ].map((view) => (
          <button
            key={view.key}
            onClick={() => setViewMode(view.key)}
            style={{
              padding: "0.75rem 1.25rem",
              backgroundColor: viewMode === view.key ? "#2563eb" : "#ffffff",
              color: viewMode === view.key ? "#ffffff" : "#374151",
              border: `1px solid ${viewMode === view.key ? "#2563eb" : "#d1d5db"}`,
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: viewMode === view.key ? 600 : 500,
              fontSize: "0.9rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
            }}
            title={view.desc}
          >
            <span>{view.label}</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{view.desc}</span>
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

        {/* Quick Filters */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {viewMode === "grouped" && (
            <button
              onClick={jumpToToday}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>📅</span>
              Jump to Today
            </button>
          )}
          
          <select
            value={courtFilter}
            onChange={(e) => setCourtFilter(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              fontSize: "0.9rem",
              backgroundColor: "#ffffff",
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
                padding: "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
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
            {filter === "today"
              ? "No bookings scheduled for today"
              : filter === "upcoming"
              ? "No upcoming bookings"
              : filter === "cancelled"
              ? "No cancelled bookings"
              : dateFilter
              ? "No bookings found for the selected date"
              : courtFilter !== "all"
              ? "No bookings found for this court"
              : "No bookings yet"}
          </p>
        </div>
      ) : (
        <>
          {viewMode === "grouped" && <GroupedByDateView />}
          {viewMode === "calendar" && <CalendarView />}
        </>
      )}

      {/* Booking Detail Modal */}
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
            padding: "1rem",
          }}
          onClick={() => setSelectedBooking(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "80vh",
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
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111827", margin: 0 }}>
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

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {selectedBooking.bookings.map((booking) => {
                const isUpcomingBooking = isUpcoming(booking);
                const isCancelled = booking.status === "cancelled";

                return (
                  <div
                    key={booking.id}
                    style={{
                      padding: "1.25rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "0.5rem",
                      border: "1px solid #e5e7eb",
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
                            gap: "0.75rem",
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
                          <strong>Time:</strong> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </div>
                        <div style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                          <strong>Player:</strong> {booking.user?.name || "Guest"}{" "}
                          {booking.user?.email && `(${booking.user.email})`}
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
                            whiteSpace: "nowrap",
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
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
