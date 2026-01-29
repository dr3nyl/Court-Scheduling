import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import OwnerLayout from "../components/OwnerLayout";

export default function OwnerCourts() {
  const [courts, setCourts] = useState([]);
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [reservationFeePercentage, setReservationFeePercentage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editHourlyRate, setEditHourlyRate] = useState("");
  const [editReservationFeePercentage, setEditReservationFeePercentage] = useState("");
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

  useEffect(() => {
    loadCourts();
  }, []);

  const loadCourts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/courts");
      setCourts(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err) {
      console.error(err);
      setError("Failed to load courts");
    } finally {
      setLoading(false);
    }
  };

  const addCourt = async () => {
    if (!name.trim()) {
      setError("Court name is required");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const payload = {
        name: name.trim(),
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        reservation_fee_percentage: reservationFeePercentage ? parseFloat(reservationFeePercentage) : 0,
      };
      const res = await api.post("/courts", payload);
      const newCourt = res.data?.data ?? res.data;
      setCourts([...courts, newCourt]);
      setName("");
      setHourlyRate("");
      setReservationFeePercentage("");
      setSuccess("Court created successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to create court");
    }
  };

  const startEdit = (court) => {
    setEditingId(court.id);
    setEditName(court.name);
    setEditActive(court.is_active !== false);
    setEditHourlyRate(court.hourly_rate || "");
    setEditReservationFeePercentage(court.reservation_fee_percentage || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditActive(true);
    setEditHourlyRate("");
    setEditReservationFeePercentage("");
  };

  const saveEdit = async (courtId) => {
    if (!editName.trim()) {
      setError("Court name is required");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const res = await api.patch(`/courts/${courtId}`, {
        name: editName.trim(),
        is_active: editActive,
        hourly_rate: editHourlyRate ? parseFloat(editHourlyRate) : null,
        reservation_fee_percentage: editReservationFeePercentage ? parseFloat(editReservationFeePercentage) : 0,
      });
      const updatedCourt = res.data?.data ?? res.data;
      setCourts(courts.map((c) => (c.id === courtId ? updatedCourt : c)));
      setEditingId(null);
      setSuccess("Court updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to update court");
    }
  };

  return (
    <OwnerLayout>
      {/* Page Header */}
      <div style={{ marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          My Courts
        </h1>
        <p style={{ color: "#6b7280", fontSize: isMobile ? "0.9rem" : "1rem" }}>
          Manage your courts and their availability schedules
        </p>
      </div>

      {/* Add Court Form */}
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
          Add New Court
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: isMobile ? "100%" : "200px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: isMobile ? "0.8rem" : "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Court Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="e.g., Court 1, Badminton Court A"
                onKeyPress={(e) => e.key === "Enter" && addCourt()}
                style={{
                  width: "100%",
                  padding: isMobile ? "0.5rem" : "0.5rem 0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  fontSize: isMobile ? "0.9rem" : "0.95rem",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: isMobile ? "100%" : "150px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: isMobile ? "0.8rem" : "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Hourly Rate (PHP)
              </label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => {
                  setHourlyRate(e.target.value);
                  setError("");
                }}
                placeholder="e.g., 300"
                min="0"
                step="0.01"
                style={{
                  width: "100%",
                  padding: isMobile ? "0.5rem" : "0.5rem 0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  fontSize: isMobile ? "0.9rem" : "0.95rem",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: isMobile ? "100%" : "150px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: isMobile ? "0.8rem" : "0.875rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Reservation Fee (%)
              </label>
              <input
                type="number"
                value={reservationFeePercentage}
                onChange={(e) => {
                  setReservationFeePercentage(e.target.value);
                  setError("");
                }}
                placeholder="e.g., 20"
                min="0"
                max="100"
                step="0.01"
                style={{
                  width: "100%",
                  padding: isMobile ? "0.5rem" : "0.5rem 0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  fontSize: isMobile ? "0.9rem" : "0.95rem",
                }}
              />
            </div>
            <button
              onClick={addCourt}
              disabled={loading}
              style={{
                padding: isMobile ? "0.5rem 1rem" : "0.5rem 1.5rem",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.375rem",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 500,
                fontSize: isMobile ? "0.9rem" : "0.95rem",
                opacity: loading ? 0.6 : 1,
                width: isMobile ? "100%" : "auto",
                alignSelf: isMobile ? "stretch" : "flex-end",
              }}
            >
              {loading ? "Adding..." : "Add Court"}
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

      {/* Courts List */}
      {loading && courts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
          Loading courts...
        </div>
      ) : courts.length === 0 ? (
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
            No courts yet
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
            Create your first court to get started
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            overflow: isMobile ? "visible" : "hidden",
          }}
        >
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem" }}>
              {courts.map((court) => (
                <div
                  key={court.id}
                  style={{
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ flex: 1 }}>
                        {editingId === court.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Court Name"
                            style={{
                              padding: "0.5rem 0.75rem",
                              borderRadius: "0.375rem",
                              border: "1px solid #d1d5db",
                              fontSize: "0.95rem",
                              width: "100%",
                              marginBottom: "0.5rem",
                            }}
                          />
                        ) : (
                          <span style={{ fontWeight: 600, color: "#111827", fontSize: "1rem" }}>{court.name}</span>
                        )}
                      </div>
                      {editingId === court.id ? (
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                          />
                          <span style={{ fontSize: "0.875rem", color: "#374151" }}>Active</span>
                        </label>
                      ) : (
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            backgroundColor: court.is_active !== false ? "#dcfce7" : "#fee2e2",
                            color: court.is_active !== false ? "#166534" : "#991b1b",
                            borderRadius: "999px",
                            fontSize: "0.85rem",
                            fontWeight: 500,
                          }}
                        >
                          {court.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      )}
                    </div>
                    {editingId === court.id && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "0.8rem",
                              fontWeight: 500,
                              color: "#374151",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Hourly Rate (PHP)
                          </label>
                          <input
                            type="number"
                            value={editHourlyRate}
                            onChange={(e) => setEditHourlyRate(e.target.value)}
                            placeholder="e.g., 300"
                            min="0"
                            step="0.01"
                            style={{
                              width: "100%",
                              padding: "0.5rem 0.75rem",
                              borderRadius: "0.375rem",
                              border: "1px solid #d1d5db",
                              fontSize: "0.9rem",
                            }}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "0.8rem",
                              fontWeight: 500,
                              color: "#374151",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Reservation Fee (%)
                          </label>
                          <input
                            type="number"
                            value={editReservationFeePercentage}
                            onChange={(e) => setEditReservationFeePercentage(e.target.value)}
                            placeholder="e.g., 20"
                            min="0"
                            max="100"
                            step="0.01"
                            style={{
                              width: "100%",
                              padding: "0.5rem 0.75rem",
                              borderRadius: "0.375rem",
                              border: "1px solid #d1d5db",
                              fontSize: "0.9rem",
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {!editingId && (
                      <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                        {court.hourly_rate ? (
                          <div>Rate: ₱{parseFloat(court.hourly_rate).toFixed(2)}/hour</div>
                        ) : (
                          <div style={{ color: "#9ca3af" }}>No rate set</div>
                        )}
                        {court.reservation_fee_percentage > 0 && (
                          <div>Reservation Fee: {court.reservation_fee_percentage}%</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {editingId === court.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(court.id)}
                          style={{
                            padding: "0.4rem 0.75rem",
                            backgroundColor: "#16a34a",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            flex: 1,
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: "0.4rem 0.75rem",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            flex: 1,
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to={`/owner/courts/${court.id}/schedule`}
                          style={{
                            padding: "0.4rem 0.75rem",
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            borderRadius: "0.375rem",
                            textDecoration: "none",
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            flex: 1,
                            textAlign: "center",
                          }}
                        >
                          Schedule
                        </Link>
                        <button
                          onClick={() => startEdit(court)}
                          style={{
                            padding: "0.4rem 0.75rem",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            flex: 1,
                          }}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    Court Name
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    Pricing
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {courts.map((court) => (
                  <tr
                    key={court.id}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      transition: "background-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                    }}
                  >
                    <td style={{ padding: "1rem" }}>
                      {editingId === court.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Court Name"
                          style={{
                            padding: "0.5rem 0.75rem",
                            borderRadius: "0.375rem",
                            border: "1px solid #d1d5db",
                            fontSize: "0.95rem",
                            width: "100%",
                            maxWidth: "300px",
                            marginBottom: "0.5rem",
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: 500, color: "#111827" }}>{court.name}</span>
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {editingId === court.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "200px" }}>
                          <input
                            type="number"
                            value={editHourlyRate}
                            onChange={(e) => setEditHourlyRate(e.target.value)}
                            placeholder="Hourly Rate (PHP)"
                            min="0"
                            step="0.01"
                            style={{
                              padding: "0.5rem 0.75rem",
                              borderRadius: "0.375rem",
                              border: "1px solid #d1d5db",
                              fontSize: "0.9rem",
                              width: "100%",
                            }}
                          />
                          <input
                            type="number"
                            value={editReservationFeePercentage}
                            onChange={(e) => setEditReservationFeePercentage(e.target.value)}
                            placeholder="Reservation Fee (%)"
                            min="0"
                            max="100"
                            step="0.01"
                            style={{
                              padding: "0.5rem 0.75rem",
                              borderRadius: "0.375rem",
                              border: "1px solid #d1d5db",
                              fontSize: "0.9rem",
                              width: "100%",
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                          {court.hourly_rate ? (
                            <div>₱{parseFloat(court.hourly_rate).toFixed(2)}/hour</div>
                          ) : (
                            <div style={{ color: "#9ca3af" }}>No rate set</div>
                          )}
                          {court.reservation_fee_percentage > 0 && (
                            <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                              Fee: {court.reservation_fee_percentage}%
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {editingId === court.id ? (
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                          />
                          <span style={{ fontSize: "0.875rem", color: "#374151" }}>Active</span>
                        </label>
                      ) : (
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            backgroundColor: court.is_active !== false ? "#dcfce7" : "#fee2e2",
                            color: court.is_active !== false ? "#166534" : "#991b1b",
                            borderRadius: "999px",
                            fontSize: "0.85rem",
                            fontWeight: 500,
                          }}
                        >
                          {court.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {editingId === court.id ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => saveEdit(court.id)}
                            style={{
                              padding: "0.4rem 0.75rem",
                              backgroundColor: "#16a34a",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              fontWeight: 500,
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{
                              padding: "0.4rem 0.75rem",
                              backgroundColor: "#f3f4f6",
                              color: "#374151",
                              border: "none",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              fontWeight: 500,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <Link
                            to={`/owner/courts/${court.id}/schedule`}
                            style={{
                              padding: "0.4rem 0.75rem",
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              borderRadius: "0.375rem",
                              textDecoration: "none",
                              fontSize: "0.85rem",
                              fontWeight: 500,
                            }}
                          >
                            Schedule
                          </Link>
                          <button
                            onClick={() => startEdit(court)}
                            style={{
                              padding: "0.4rem 0.75rem",
                              backgroundColor: "#f3f4f6",
                              color: "#374151",
                              border: "none",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              fontWeight: 500,
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </OwnerLayout>
  );
}
