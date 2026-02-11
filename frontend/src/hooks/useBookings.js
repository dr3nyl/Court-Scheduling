import { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import {
  todayString,
  formatDate,
  formatDateShort,
  isUpcoming,
  isPast,
  groupBookingsByDate,
  groupBookingsByCourt,
  buildSessionsFromCourtBookings,
  getDateStatus,
} from "../utils/bookingUtils";

export function useBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [dateSearch, setDateSearch] = useState("");
  const [datePickerValue, setDatePickerValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [bottomSheet, setBottomSheet] = useState(null);
  const [thisWeekOnly, setThisWeekOnly] = useState(false);
  const todayCardRef = useRef(null);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/player/bookings");
      setBookings(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    if (bookings.length === 0) return;
    const today = todayString();
    const expanded = new Set();
    const grouped = groupBookingsByDate(bookings);
    Object.keys(grouped).forEach((dateStr) => {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);
      if (d >= todayDate) expanded.add(dateStr);
    });
    setExpandedDates(expanded);
    const t = setTimeout(() => {
      const el = document.getElementById(`date-card-${today}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        todayCardRef.current = el;
      }
    }, 300);
    return () => clearTimeout(t);
  }, [bookings]);

  const handleCancelSession = async (bookingsToCancel) => {
    if (!cancelConfirm || !bookingsToCancel?.length) return;
    setCancelConfirm(null);

    try {
      setCancellingId(bookingsToCancel[0].id);
      await Promise.all(bookingsToCancel.map((b) => api.delete(`/bookings/${b.id}`)));
      toast.success(
        bookingsToCancel.length === 1
          ? "Booking cancelled successfully"
          : `${bookingsToCancel.length} bookings cancelled successfully`
      );
      await loadBookings();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (filter === "upcoming") return isUpcoming(booking);
      if (filter === "past") return isPast(booking);
      if (filter === "cancelled") return booking.status === "cancelled";
      return true;
    });
  }, [bookings, filter]);

  const groupedBookings = useMemo(() => {
    const grouped = groupBookingsByDate(filteredBookings);

    const sortedDates = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      if (filter === "upcoming") return dateA - dateB;
      if (filter === "past") return dateB - dateA;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isAUpcoming = dateA >= today;
      const isBUpcoming = dateB >= today;
      if (isAUpcoming && !isBUpcoming) return -1;
      if (!isAUpcoming && isBUpcoming) return 1;
      return isAUpcoming ? dateA - dateB : dateB - dateA;
    });

    let filteredDates = sortedDates;
    if (datePickerValue) {
      filteredDates = sortedDates.filter((dateStr) => dateStr === datePickerValue);
    } else if (thisWeekOnly) {
      const today = new Date(todayString());
      today.setHours(0, 0, 0, 0);
      const endWeek = new Date(today);
      endWeek.setDate(endWeek.getDate() + 6);
      filteredDates = sortedDates.filter((dateStr) => {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d >= today && d <= endWeek;
      });
    } else if (dateSearch) {
      const searchLower = dateSearch.toLowerCase();
      filteredDates = sortedDates.filter(
        (dateStr) =>
          formatDateShort(dateStr).toLowerCase().includes(searchLower) ||
          formatDate(dateStr).toLowerCase().includes(searchLower)
      );
    }

    return filteredDates.map((dateStr) => {
      const dateBookings = grouped[dateStr].sort((a, b) => a.start_time.localeCompare(b.start_time));
      const courts = groupBookingsByCourt(grouped[dateStr]).map((courtGroup) => ({
        ...courtGroup,
        sessions: buildSessionsFromCourtBookings(courtGroup.bookings, isUpcoming),
      }));
      return {
        date: dateStr,
        bookings: dateBookings,
        courts,
        dateStatus: getDateStatus(dateBookings),
      };
    });
  }, [filteredBookings, filter, dateSearch, datePickerValue, thisWeekOnly]);

  const upcomingCount = bookings.filter(isUpcoming).length;
  const pastCount = bookings.filter(isPast).length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;

  const toggleDate = (dateStr) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateStr)) newExpanded.delete(dateStr);
    else newExpanded.add(dateStr);
    setExpandedDates(newExpanded);
  };

  const sessionKey = (courtId, startTime) => `${courtId}-${startTime}`;

  const toggleSession = (courtId, startTime) => {
    const key = sessionKey(courtId, startTime);
    const next = new Set(expandedSessions);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedSessions(next);
    setMenuOpen(null);
  };

  const jumpToToday = () => {
    const today = todayString();
    const todayGroup = groupedBookings.find((g) => g.date === today);
    const newExpanded = new Set(expandedDates);
    newExpanded.add(today);
    setExpandedDates(newExpanded);
    setDateSearch("");
    setDatePickerValue("");
    setThisWeekOnly(false);
    setTimeout(() => {
      const el = document.getElementById(`date-card-${today}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("my-bookings-today-highlight");
        setTimeout(() => el.classList.remove("my-bookings-today-highlight"), 2000);
      }
    }, 150);
    if (!todayGroup) setFilter("all");
  };

  const applyQuickFilter = (type) => {
    if (type === "today") {
      setDatePickerValue(todayString());
      setDateSearch("");
      const today = todayString();
      const newExpanded = new Set(expandedDates);
      newExpanded.add(today);
      setExpandedDates(newExpanded);
      setTimeout(() => {
        const el = document.getElementById(`date-card-${today}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    if (type === "thisWeek") {
      setDateSearch("");
      setDatePickerValue("");
      setThisWeekOnly(true);
      setFilter("upcoming");
    }
  };

  const clearDateFilters = () => {
    setDateSearch("");
    setDatePickerValue("");
    setThisWeekOnly(false);
  };

  const handleDatePickerChange = (v) => {
    setDatePickerValue(v);
    setThisWeekOnly(false);
    if (v) {
      const d = new Date(v);
      setDateSearch(d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }));
    } else {
      setDateSearch("");
    }
  };

  return {
    bookings,
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
    loadBookings,
    filteredBookings,
    groupedBookings,
    upcomingCount,
    pastCount,
    cancelledCount,
    todayCardRef,
    toggleDate,
    toggleSession,
    sessionKey,
    jumpToToday,
    applyQuickFilter,
    clearDateFilters,
    handleDatePickerChange,
    handleCancelSession,
  };
}
