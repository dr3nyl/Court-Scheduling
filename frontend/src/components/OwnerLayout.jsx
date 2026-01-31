import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

export default function OwnerLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Logo/Brand */}
          <Link
            to="/owner"
            style={{
              fontSize: isMobile ? "1.25rem" : "1.5rem",
              fontWeight: "bold",
              color: "#2563eb",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            CourtScheduler
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: isMobile ? "flex" : "none",
              flexDirection: "column",
              gap: "4px",
              padding: "0.5rem",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Toggle menu"
          >
            <span
              style={{
                width: "24px",
                height: "2px",
                backgroundColor: "#374151",
                transition: "all 0.3s",
                transform: mobileMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none",
              }}
            />
            <span
              style={{
                width: "24px",
                height: "2px",
                backgroundColor: "#374151",
                transition: "all 0.3s",
                opacity: mobileMenuOpen ? 0 : 1,
              }}
            />
            <span
              style={{
                width: "24px",
                height: "2px",
                backgroundColor: "#374151",
                transition: "all 0.3s",
                transform: mobileMenuOpen ? "rotate(-45deg) translate(7px, -6px)" : "none",
              }}
            />
          </button>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: isMobile ? "none" : "flex",
              gap: "1.5rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {user?.role === "superadmin" && (
              <Link
                to="/admin"
                style={{
                  color: "#7c3aed",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  whiteSpace: "nowrap",
                }}
              >
                ← Admin
              </Link>
            )}
            <Link
              to="/owner"
              style={{
                color: "#374151",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
                whiteSpace: "nowrap",
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
                whiteSpace: "nowrap",
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
                whiteSpace: "nowrap",
              }}
            >
              All Bookings
            </Link>
            <Link
              to="/owner/analytics"
              style={{
                color: "#374151",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
                whiteSpace: "nowrap",
              }}
            >
              Analytics
            </Link>
            <Link
              to="/help"
              style={{
                color: "#374151",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
                whiteSpace: "nowrap",
              }}
            >
              Help
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
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: "#6b7280", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
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
                  whiteSpace: "nowrap",
                }}
              >
                Logout
              </button>
            </div>
          </nav>

          {/* Mobile Navigation Menu */}
          {isMobile && mobileMenuOpen && (
            <nav
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid #e5e7eb",
                marginTop: "1rem",
              }}
            >
              {user?.role === "superadmin" && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    color: "#7c3aed",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    padding: "0.75rem",
                    borderRadius: "0.375rem",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  ← Admin
                </Link>
              )}
              <Link
                to="/owner"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: "#374151",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                Dashboard
              </Link>
              <Link
                to="/owner/courts"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: "#374151",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                My Courts
              </Link>
              <Link
                to="/owner/bookings"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: "#374151",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                All Bookings
              </Link>
              <Link
                to="/owner/analytics"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: "#374151",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                Analytics
              </Link>
              <Link
                to="/help"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: "#374151",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                  padding: "0.75rem",
                  borderRadius: "0.375rem",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                Help
              </Link>
              <div
                style={{
                  padding: "0.75rem",
                  borderTop: "1px solid #e5e7eb",
                  marginTop: "0.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  Hello, {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    width: "100%",
                  }}
                >
                  Logout
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: isMobile ? "1rem" : "2rem 1.5rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}
