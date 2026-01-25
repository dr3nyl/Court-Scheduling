import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function OwnerLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Navigation Header */}
      <header
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem 0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Logo/Brand */}
          <Link
            to="/owner"
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#2563eb",
              textDecoration: "none",
            }}
          >
            CourtScheduler
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
            <Link
              to="/owner"
              style={{
                color: "#374151",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
              }}
            >
              Dashboard
            </Link>
            <Link
              to="/owner/courts"
              style={{
                color: "#374151",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
              }}
            >
              My Courts
            </Link>
            <Link
              to="/owner/bookings"
              style={{
                color: "#374151",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
              }}
            >
              All Bookings
            </Link>

            {/* User Menu */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginLeft: "1rem",
                paddingLeft: "1rem",
                borderLeft: "1px solid #e5e7eb",
              }}
            >
              <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                Hello, {user?.name}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: "0.4rem 0.75rem",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}
