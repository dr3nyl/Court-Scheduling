import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "owner",
  });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    api.get("/admin/users?" + params.toString())
      .then((res) => setUsers(res.data.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password || !createForm.password_confirmation) {
      setCreateError("Please fill in all fields");
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError("Password must be at least 8 characters with letters and numbers");
      return;
    }
    if (createForm.password !== createForm.password_confirmation) {
      setCreateError("Passwords do not match");
      return;
    }
    try {
      setCreateLoading(true);
      setCreateError("");
      await api.post("/admin/users", createForm);
      setCreateForm({ name: "", email: "", password: "", password_confirmation: "", role: "owner" });
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      setCreateError(err?.response?.data?.message || err?.response?.data?.errors?.email?.[0] || "Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1e293b" }}>User Management</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Create Owner / Queue Master
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            fontSize: "0.95rem",
            minWidth: "200px",
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            fontSize: "0.95rem",
          }}
        >
          <option value="">All roles</option>
          <option value="player">Player</option>
          <option value="owner">Owner</option>
          <option value="queue_master">Queue Master</option>
          <option value="superadmin">Super Admin</option>
        </select>
      </div>

      {showCreate && (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Create Owner or Queue Master</h2>
          {createError && (
            <div style={{ padding: "0.5rem", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "0.375rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
              {createError}
            </div>
          )}
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}>Name</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
                style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}>Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
                style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}>Role</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
              >
                <option value="owner">Court Owner</option>
                <option value="queue_master">Queue Master</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}>Password (min 8 chars, letters & numbers)</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
                minLength={8}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}>Confirm Password</label>
              <input
                type="password"
                value={createForm.password_confirmation}
                onChange={(e) => setCreateForm({ ...createForm, password_confirmation: e.target.value })}
                required
                minLength={8}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="submit"
                disabled={createLoading}
                style={{ padding: "0.5rem 1rem", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 500 }}
              >
                {createLoading ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateError(""); }}
                style={{ padding: "0.5rem 1rem", backgroundColor: "#6b7280", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ backgroundColor: "#fff", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No users found</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Name</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Email</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Role</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.95rem" }}>{u.name}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.95rem", color: "#64748b" }}>{u.email}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        backgroundColor: u.role === "superadmin" ? "#fef3c7" : u.role === "owner" ? "#dbeafe" : u.role === "queue_master" ? "#d1fae5" : "#f3f4f6",
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#64748b" }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
