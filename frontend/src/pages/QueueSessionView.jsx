import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import QueueMasterLayout from "../components/QueueMasterLayout";

export default function QueueSessionView() {
  const { sessionId } = useParams();
  const { user } = useContext(AuthContext);
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [availableCourts, setAvailableCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addMode, setAddMode] = useState("guest"); // "guest" | "user"
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearching, setUserSearching] = useState(false);
  const [form, setForm] = useState({ guest_name: "", level: "3.5", phone: "", notes: "", user_id: "", levelOverride: "" });

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError("");
      const [sRes, eRes, cRes] = await Promise.all([
        api.get(`/queue/sessions/${sessionId}`),
        api.get(`/queue/sessions/${sessionId}/entries`),
        api.get(`/queue/sessions/${sessionId}/available-courts`),
      ]);
      setSession(sRes.data);
      setEntries(eRes.data);
      setAvailableCourts(cRes.data);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  // User search debounce
  useEffect(() => {
    if (addMode !== "user" || userQuery.length < 2) {
      setUserResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setUserSearching(true);
      try {
        const res = await api.get(`/queue/users?q=${encodeURIComponent(userQuery)}`);
        setUserResults(Array.isArray(res.data) ? res.data : []);
      } catch {
        setUserResults([]);
      } finally {
        setUserSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [addMode, userQuery]);

  async function handleStartSession() {
    try {
      await api.patch(`/queue/sessions/${sessionId}`, { status: "active" });
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to start");
    }
  }

  async function handleEndSession() {
    try {
      await api.patch(`/queue/sessions/${sessionId}`, { status: "ended" });
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to end");
    }
  }

  async function handleAddEntry(e) {
    e.preventDefault();
    setError("");
    try {
      if (addMode === "guest") {
        await api.post(`/queue/sessions/${sessionId}/entries`, {
          guest_name: form.guest_name,
          level: parseFloat(form.level),
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        });
      } else {
        await api.post(`/queue/sessions/${sessionId}/entries`, {
          user_id: Number(form.user_id),
          level: form.levelOverride ? parseFloat(form.levelOverride) : undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        });
      }
      setForm({ guest_name: "", level: "3.5", phone: "", notes: "", user_id: "", levelOverride: "" });
      setUserQuery("");
      setUserResults([]);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add player");
    }
  }

  async function handleExit(entryId) {
    try {
      await api.patch(`/queue/entries/${entryId}`, { status: "left" });
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update");
    }
  }

  async function handleRemove(entryId) {
    if (!window.confirm("Remove from queue?")) return;
    try {
      await api.delete(`/queue/entries/${entryId}`);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to remove");
    }
  }

  function pickUser(u) {
    setForm((f) => ({ ...f, user_id: u.id, levelOverride: u.level != null ? String(u.level) : "" }));
    setUserQuery(u.name);
    setUserResults([]);
  }

  function displayName(entry) {
    return entry.user_id ? (entry.user?.name || "") : (entry.guest_name || "");
  }

  if (loading && !session) {
    return (
      <QueueMasterLayout>
        <p style={{ color: "#6b7280" }}>Loading…</p>
      </QueueMasterLayout>
    );
  }

  if (!session) {
    return (
      <QueueMasterLayout>
        <div style={{ color: "#b91c1c" }}>Session not found.</div>
        <Link to="/queue-master" style={{ color: "#059669", marginTop: "0.5rem", display: "inline-block" }}>← Back to sessions</Link>
      </QueueMasterLayout>
    );
  }

  const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <QueueMasterLayout>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link to="/queue-master" style={{ color: "#059669", textDecoration: "none", fontSize: "0.9rem", marginBottom: "0.5rem", display: "inline-block" }}>← Sessions</Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#111827" }}>
          {formatDate(session.date)} · {String(session.start_time).slice(0, 5)}
        </h1>
        <div style={{ color: "#6b7280", fontSize: "0.95rem" }}>
          {session.owner?.name && `Owner: ${session.owner.name} · `} Status: <strong>{session.status}</strong>
          {availableCourts.length > 0 && ` · ${availableCourts.length} court(s) free`}
        </div>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem", color: "#b91c1c", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Start / End session */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}>
        {session.status === "upcoming" && (
          <button
            type="button"
            onClick={handleStartSession}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer" }}
          >
            Start session
          </button>
        )}
        {session.status === "active" && (
          <button
            type="button"
            onClick={handleEndSession}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer" }}
          >
            End session
          </button>
        )}
      </div>

      {/* Add player */}
      <div style={{ marginBottom: "1.5rem", padding: "1.5rem", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.75rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>Add player</h3>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={() => setAddMode("guest")}
            style={{
              padding: "0.4rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              background: addMode === "guest" ? "#d1fae5" : "#fff",
              cursor: "pointer",
              fontWeight: addMode === "guest" ? 600 : 400,
            }}
          >
            Guest
          </button>
          <button
            type="button"
            onClick={() => setAddMode("user")}
            style={{
              padding: "0.4rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              background: addMode === "user" ? "#d1fae5" : "#fff",
              cursor: "pointer",
              fontWeight: addMode === "user" ? 600 : 400,
            }}
          >
            User
          </button>
        </div>

        <form onSubmit={handleAddEntry} style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
          {addMode === "guest" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Name</label>
                <input
                  value={form.guest_name}
                  onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
                  required
                  placeholder="Guest name"
                  style={{ width: "180px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Level</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="7"
                  value={form.level}
                  onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                  required
                  style={{ width: "80px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
                />
              </div>
            </>
          )}

          {addMode === "user" && (
            <>
              <div style={{ position: "relative" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Search user</label>
                <input
                  value={userQuery}
                  onChange={(e) => { setUserQuery(e.target.value); setForm((f) => ({ ...f, user_id: "" })); }}
                  placeholder="Type name or email…"
                  style={{ width: "220px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
                />
                {userSearching && <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#6b7280" }}>Searching…</span>}
                {userResults.length > 0 && (
                  <ul style={{ position: "absolute", top: "100%", left: 0, right: 0, margin: 0, padding: "0.25rem 0", listStyle: "none", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.375rem", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", zIndex: 10 }}>
                    {userResults.map((u) => (
                      <li key={u.id}>
                        <button type="button" onClick={() => pickUser(u)} style={{ width: "100%", textAlign: "left", padding: "0.5rem 0.75rem", border: "none", background: "none", cursor: "pointer", fontSize: "0.9rem" }}>
                          {u.name} {u.level != null ? `(${u.level})` : ""}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {form.user_id && (
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Level override</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="7"
                    value={form.levelOverride}
                    onChange={(e) => setForm((f) => ({ ...f, levelOverride: e.target.value }))}
                    placeholder="From profile"
                    style={{ width: "90px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Phone (opt)</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={{ width: "140px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Notes (opt)</label>
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ width: "160px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }} />
          </div>
          <button
            type="submit"
            disabled={addMode === "user" && !form.user_id}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "0.375rem", fontWeight: 500, cursor: form.user_id || addMode === "guest" ? "pointer" : "not-allowed", opacity: addMode === "user" && !form.user_id ? 0.6 : 1 }}
          >
            Add
          </button>
        </form>
      </div>

      {/* Queue / entries */}
      <div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>Queue ({entries.length})</h3>
        {entries.length === 0 ? (
          <p style={{ color: "#6b7280", padding: "1.5rem", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.75rem" }}>No players yet. Add a guest or user above.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem 1.25rem",
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{displayName(entry)}</span>
                  <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>· {entry.level} · {entry.status}</span>
                  {entry.games_played != null && entry.games_played > 0 && (
                    <span style={{ color: "#059669", marginLeft: "0.5rem" }}>· {entry.games_played} games</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {!["left", "done"].includes(entry.status) && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleExit(entry.id)}
                        style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem", backgroundColor: "#fef3c7", color: "#92400e", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
                      >
                        Exit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(entry.id)}
                        style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem", backgroundColor: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available courts (info) */}
      {availableCourts.length > 0 && (
        <div style={{ marginTop: "1.5rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Available courts: {availableCourts.map((c) => c.name).join(", ")}
        </div>
      )}
    </QueueMasterLayout>
  );
}
