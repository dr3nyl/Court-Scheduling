import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [form, setForm] = useState({
    email: emailParam,
    password: "",
    password_confirmation: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.password || !form.password_confirmation) {
      setError("Please fill in all fields");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters with letters and numbers");
      return;
    }
    if (form.password !== form.password_confirmation) {
      setError("Passwords do not match");
      return;
    }
    if (!/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password)) {
      setError("Password must contain both letters and numbers");
      return;
    }
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setMessage("");
      await api.post("/reset-password", {
        token,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      setMessage("Password has been reset successfully. You can now log in.");
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid or expired reset link. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
        padding: "2rem 1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          padding: "2.5rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
            Reset Password
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
            Enter your new password below
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "0.875rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              color: "#b91c1c",
              marginBottom: "1.5rem",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: "0.875rem",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "0.5rem",
              color: "#166534",
              marginBottom: "1.5rem",
              fontSize: "0.875rem",
            }}
          >
            {message}
            <div style={{ marginTop: "1rem" }}>
              <Link to="/login" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
                Go to login →
              </Link>
            </div>
          </div>
        )}

        {!message && (
          <form onSubmit={submit}>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem" }}>
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem" }}>
                New Password
              </label>
              <input
                type="password"
                placeholder="Min. 8 characters, letters and numbers"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem" }}>
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={form.password_confirmation}
                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                required
                minLength={8}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.875rem",
                backgroundColor: loading ? "#9ca3af" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link to="/login" style={{ color: "#2563eb", textDecoration: "none", fontSize: "0.875rem" }}>
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
