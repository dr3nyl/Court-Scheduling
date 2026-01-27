import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import QueueMasterLayout from "../components/QueueMasterLayout";

export default function QueueMasterDashboard() {
  const { user } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(() => ({ date: new Date().toISOString().slice(0, 10), start_time: "18:00", end_time: "", owner_id: "" }));

  const isOwner = user?.role === "owner";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [sRes, oRes] = await Promise.all([
        api.get("/queue/sessions"),
        !isOwner ? api.get("/queue/owners").catch(() => []) : Promise.resolve({ data: [] }),
      ]);
      setSessions(sRes.data);
      setOwners(Array.isArray(oRes?.data) ? oRes.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    load();
  }, [load]);

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = { date: form.date, start_time: form.start_time };
      if (form.end_time) payload.end_time = form.end_time;
      if (!isOwner && form.owner_id) payload.owner_id = Number(form.owner_id);
      await api.post("/queue/sessions", payload);
      setForm({ date: today(), start_time: "18:00", end_time: "", owner_id: "" });
      setCreateOpen(false);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create session");
    }
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  return (
    <QueueMasterLayout>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          Queue sessions
        </h1>
        <p style={{ color: "#6b7280", fontSize: "1rem" }}>Create and manage queue sessions. Doubles only (4 per match).</p>
      </div>

      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827" }}>Sessions</h2>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#059669",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          New session
        </button>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem", color: "#b91c1c", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {createOpen && (
        <form
          onSubmit={handleCreate}
          style={{
            padding: "1.5rem",
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "0.75rem",
            marginBottom: "1.5rem",
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            alignItems: "end",
          }}
        >
          {!isOwner && owners.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Owner</label>
              <select
                value={form.owner_id}
                onChange={(e) => setForm((f) => ({ ...f, owner_id: e.target.value }))}
                required
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
              >
                <option value="">Select owner</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Start</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              required
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>End (optional)</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="submit"
              style={{ padding: "0.5rem 1rem", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "0.375rem", fontWeight: 500, cursor: "pointer" }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => { setCreateOpen(false); setForm({ date: today(), start_time: "18:00", end_time: "", owner_id: "" }); }}
              style={{ padding: "0.5rem 1rem", backgroundColor: "#e5e7eb", color: "#374151", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <div style={{ padding: "3rem", backgroundColor: "#fff", borderRadius: "0.75rem", border: "1px solid #e5e7eb", textAlign: "center" }}>
          <p style={{ color: "#6b7280" }}>No sessions yet. Create one to get started.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sessions.map((s) => (
            <Link
              key={s.id}
              to={`/queue-master/sessions/${s.id}`}
              style={{
                padding: "1.25rem",
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "#111827" }}>{formatDate(s.date)} · {String(s.start_time).slice(0, 5)}</div>
                <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  {s.owner?.name && `Owner: ${s.owner.name} · `} Status: {s.status}
                </div>
              </div>
              <span style={{ color: "#059669", fontWeight: 500 }}>Open →</span>
            </Link>
          ))}
        </div>
      )}
    </QueueMasterLayout>
  );
}
