import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  // Get register function from AuthContext
  const { register } = useContext(AuthContext);

  // Used to redirect user
  const navigate = useNavigate();

  // Store all form fields in one object
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "player", // default role
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle form submit
  const submit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all fields");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Call register API
      await register(form);

      // Redirect based on role after successful registration
      if (form.role === "player") {
        navigate("/player");
      } else if (form.role === "owner") {
        navigate("/owner");
      } else if (form.role === "queue_master") {
        navigate("/queue-master");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err?.response?.data?.message || "Registration failed. Please try again.");
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
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "0.5rem",
            }}
          >
            Create Account
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
            Sign up to start booking courts
          </p>
        </div>

        {/* Error Message */}
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
                marginLeft: "0.5rem",
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={submit}>
          {/* Name input */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setError("");
              }}
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

          {/* Email input */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setError("");
              }}
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

          {/* Password input */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="Create a password (min. 6 characters)"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                setError("");
              }}
              required
              minLength={6}
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

          {/* Role selection */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              I am a...
            </label>
            <select
              value={form.role}
              onChange={(e) => {
                setForm({ ...form, role: e.target.value });
                setError("");
              }}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                fontSize: "0.95rem",
                backgroundColor: "#ffffff",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              <option value="player">Player</option>
              <option value="owner">Court Owner</option>
              <option value="queue_master">Queue Master</option>
            </select>
          </div>

          {/* Submit button */}
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
              marginBottom: "1.5rem",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = "#1d4ed8";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = "#2563eb";
              }
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Sign in link */}
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "#2563eb",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link
            to="/"
            style={{
              color: "#6b7280",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
