import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import OwnerLayout from "../components/OwnerLayout";

export default function OwnerCourtSchedule() {
  const { courtId } = useParams();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [court, setCourt] = useState(null);
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editOpenTime, setEditOpenTime] = useState("");
  const [editCloseTime, setEditCloseTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [schedulesRes, courtsRes] = await Promise.all([
        api.get(`/owner/courts/${courtId}/availability`),
        api.get("/courts"),
      ]);
      setSchedules(schedulesRes.data);
      const foundCourt = courtsRes.data.find((c) => c.id.toString() === courtId);
      setCourt(foundCourt);
    } catch (err) {
      console.error(err);
      setError("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  }, [courtId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addSchedule = async () => {
    if (!dayOfWeek || !openTime || !closeTime) {
      setError("Please fill in all fields");
      return;
    }

    if (openTime >= closeTime) {
      setError("Close time must be after open time");
      return;
    }

    // Check if schedule already exists for this day
    if (schedules.some((s) => s.day_of_week === Number(dayOfWeek))) {
      setError("A schedule already exists for this day. Please edit the existing one.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const res = await api.post(`/owner/courts/${courtId}/availability`, {
        day_of_week: Number(dayOfWeek),
        open_time: openTime,
        close_time: closeTime,
      });

      setSchedules([...schedules, res.data]);
      setDayOfWeek("");
      setOpenTime("");
      setCloseTime("");
      setSuccess("Schedule added successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to add schedule");
    }
  };

  const startEdit = (schedule) => {
    setEditingId(schedule.id);
    setEditOpenTime(schedule.open_time);
    setEditCloseTime(schedule.close_time);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditOpenTime("");
    setEditCloseTime("");
  };

  const saveEdit = async (scheduleId) => {
    if (!editOpenTime || !editCloseTime) {
      setError("Please fill in all fields");
      return;
    }

    if (editOpenTime >= editCloseTime) {
      setError("Close time must be after open time");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const res = await api.put(`/owner/courts/${courtId}/availability/${scheduleId}`, {
        open_time: editOpenTime,
        close_time: editCloseTime,
      });

      setSchedules(schedules.map((s) => (s.id === scheduleId ? res.data : s)));
      setEditingId(null);
      setSuccess("Schedule updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to update schedule");
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await api.delete(`/owner/courts/${courtId}/availability/${scheduleId}`);
      setSchedules(schedules.filter((s) => s.id !== scheduleId));
      setSuccess("Schedule deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to delete schedule");
    }
  };

  const dayName = (day) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };

  // Create a map of day_of_week to schedule for easy lookup
  const scheduleMap = {};
  schedules.forEach((s) => {
    scheduleMap[s.day_of_week] = s;
  });

  return (
    <OwnerLayout>
      {/* Page Header */}
      <div style={{ marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <button
          onClick={() => navigate("/owner/courts")}
          style={{
            marginBottom: "1rem",
            padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1rem",
            backgroundColor: "#f3f4f6",
            color: "#374151",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontSize: isMobile ? "0.85rem" : "0.9rem",
            fontWeight: 500,
          }}
        >
          ← Back to Courts
        </button>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          {court?.name || "Court"} Schedule
        </h1>
        <p style={{ color: "#6b7280", fontSize: isMobile ? "0.9rem" : "1rem" }}>
          Set weekly availability hours for this court
        </p>
      </div>

      {/* Add Schedule Form */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>
          Add Schedule
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: isMobile ? "0.8rem" : "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Day of Week
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => {
                setDayOfWeek(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: isMobile ? "0.5rem" : "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                fontSize: isMobile ? "0.9rem" : "0.95rem",
                backgroundColor: "#ffffff",
                cursor: "pointer",
              }}
            >
              <option value="">Select day</option>
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: isMobile ? "0.8rem" : "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Open Time
            </label>
            <input
              type="time"
              value={openTime}
              onChange={(e) => {
                setOpenTime(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: isMobile ? "0.5rem" : "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                fontSize: isMobile ? "0.9rem" : "0.95rem",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: isMobile ? "0.8rem" : "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Close Time
            </label>
            <input
              type="time"
              value={closeTime}
              onChange={(e) => {
                setCloseTime(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: isMobile ? "0.5rem" : "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                fontSize: isMobile ? "0.9rem" : "0.95rem",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={addSchedule}
              disabled={loading}
              style={{
                width: "100%",
                padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1rem",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.375rem",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 500,
                fontSize: isMobile ? "0.9rem" : "0.95rem",
                opacity: loading ? 0.6 : 1,
              }}
            >
              Add Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
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

      {/* Weekly Schedule View */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827" }}>
            Weekly Schedule
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>
            Loading schedule...
          </div>
        ) : schedules.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              No schedules configured yet
            </p>
            <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
              Add schedules above to set availability for this court
            </p>
          </div>
        ) : (
          <div>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const schedule = scheduleMap[day];
              const isEditing = schedule && editingId === schedule.id;

              return (
                <div
                  key={day}
                  style={{
                    padding: isMobile ? "1rem" : "1.25rem 1.5rem",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "flex-start" : "center",
                    gap: isMobile ? "0.75rem" : "0",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  <div style={{ flex: 1, width: "100%" }}>
                    <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.5rem", fontSize: isMobile ? "0.95rem" : "1rem" }}>
                      {dayName(day)}
                    </div>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="time"
                          value={editOpenTime}
                          onChange={(e) => setEditOpenTime(e.target.value)}
                          style={{
                            padding: isMobile ? "0.4rem" : "0.4rem 0.6rem",
                            borderRadius: "0.375rem",
                            border: "1px solid #d1d5db",
                            fontSize: isMobile ? "0.85rem" : "0.9rem",
                            flex: isMobile ? 1 : "none",
                          }}
                        />
                        <span style={{ color: "#6b7280", fontSize: isMobile ? "0.85rem" : "0.9rem" }}>to</span>
                        <input
                          type="time"
                          value={editCloseTime}
                          onChange={(e) => setEditCloseTime(e.target.value)}
                          style={{
                            padding: isMobile ? "0.4rem" : "0.4rem 0.6rem",
                            borderRadius: "0.375rem",
                            border: "1px solid #d1d5db",
                            fontSize: isMobile ? "0.85rem" : "0.9rem",
                            flex: isMobile ? 1 : "none",
                          }}
                        />
                      </div>
                    ) : schedule ? (
                      <div style={{ color: "#6b7280", fontSize: isMobile ? "0.9rem" : "0.95rem" }}>
                        {schedule.open_time} - {schedule.close_time}
                      </div>
                    ) : (
                      <div style={{ color: "#9ca3af", fontSize: isMobile ? "0.85rem" : "0.9rem", fontStyle: "italic" }}>
                        No schedule set
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(schedule.id)}
                          style={{
                            padding: isMobile ? "0.4rem 0.75rem" : "0.4rem 0.75rem",
                            backgroundColor: "#16a34a",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: isMobile ? "0.8rem" : "0.85rem",
                            fontWeight: 500,
                            flex: isMobile ? 1 : "none",
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: isMobile ? "0.4rem 0.75rem" : "0.4rem 0.75rem",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: isMobile ? "0.8rem" : "0.85rem",
                            fontWeight: 500,
                            flex: isMobile ? 1 : "none",
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : schedule ? (
                      <>
                        <button
                          onClick={() => startEdit(schedule)}
                          style={{
                            padding: isMobile ? "0.4rem 0.75rem" : "0.4rem 0.75rem",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: isMobile ? "0.8rem" : "0.85rem",
                            fontWeight: 500,
                            flex: isMobile ? 1 : "none",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          style={{
                            padding: isMobile ? "0.4rem 0.75rem" : "0.4rem 0.75rem",
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: isMobile ? "0.8rem" : "0.85rem",
                            fontWeight: 500,
                            flex: isMobile ? 1 : "none",
                          }}
                        >
                          Delete
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}