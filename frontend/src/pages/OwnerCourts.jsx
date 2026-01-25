import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import OwnerLayout from "../components/OwnerLayout";

export default function OwnerCourts() {
  const [courts, setCourts] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadCourts();
  }, []);

  const loadCourts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/courts");
      setCourts(res.data);
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
      const res = await api.post("/courts", { name: name.trim() });
      setCourts([...courts, res.data]);
      setName("");
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditActive(true);
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
      });
      setCourts(courts.map((c) => (c.id === courtId ? res.data : c)));
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
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          My Courts
        </h1>
        <p style={{ color: "#6b7280", fontSize: "1rem" }}>
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
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
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
                padding: "0.5rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                fontSize: "0.95rem",
              }}
            />
          </div>
          <button
            onClick={addCourt}
            disabled={loading}
            style={{
              padding: "0.5rem 1.5rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.375rem",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 500,
              fontSize: "0.95rem",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Adding..." : "Add Court"}
          </button>
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
            overflow: "hidden",
          }}
        >
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
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderRadius: "0.375rem",
                          border: "1px solid #d1d5db",
                          fontSize: "0.95rem",
                          width: "100%",
                          maxWidth: "300px",
                        }}
                      />
                    ) : (
                      <span style={{ fontWeight: 500, color: "#111827" }}>{court.name}</span>
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
        </div>
      )}
    </OwnerLayout>
  );
}
