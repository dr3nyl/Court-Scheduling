import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

export default function SuperAdminLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
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
      <header
        style={{
          backgroundColor: "#1e293b",
          borderBottom: "1px solid #334155",
          padding: "1rem 0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
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
          <Link
            to="/admin"
            style={{
              fontSize: isMobile ? "1.25rem" : "1.5rem",
              fontWeight: "bold",
              color: "#f8fafc",
              textDecoration: "none",
            }}
          >
            CourtScheduler Admin
          </Link>

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
            <span style={{ width: "24px", height: "2px", backgroundColor: "#f8fafc" }} />
            <span style={{ width: "24px", height: "2px", backgroundColor: "#f8fafc" }} />
            <span style={{ width: "24px", height: "2px", backgroundColor: "#f8fafc" }} />
          </button>

          <nav style={{ display: isMobile ? "none" : "flex", gap: "1.5rem", alignItems: "center" }}>
            <Link to="/admin" style={{ color: "#94a3b8", textDecoration: "none", fontWeight: 500 }}>
              Users
            </Link>
            <Link to="/owner" style={{ color: "#94a3b8", textDecoration: "none", fontWeight: 500 }}>
              Owner View
            </Link>
            <Link to="/queue-master" style={{ color: "#94a3b8", textDecoration: "none", fontWeight: 500 }}>
              Queue View
            </Link>
            <Link to="/help" style={{ color: "#94a3b8", textDecoration: "none", fontWeight: 500 }}>
              Help
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "1rem", paddingLeft: "1rem", borderLeft: "1px solid #475569" }}>
              <span style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>Super Admin</span>
              <button
                onClick={handleLogout}
                style={{
                  padding: "0.4rem 0.75rem",
                  backgroundColor: "#dc2626",
                  color: "#fff",
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

        {isMobile && mobileMenuOpen && (
          <nav
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1rem",
              borderTop: "1px solid #334155",
            }}
          >
            <Link to="/admin" onClick={() => setMobileMenuOpen(false)} style={{ color: "#94a3b8", textDecoration: "none", padding: "0.5rem" }}>Users</Link>
            <Link to="/owner" onClick={() => setMobileMenuOpen(false)} style={{ color: "#94a3b8", textDecoration: "none", padding: "0.5rem" }}>Owner View</Link>
            <Link to="/queue-master" onClick={() => setMobileMenuOpen(false)} style={{ color: "#94a3b8", textDecoration: "none", padding: "0.5rem" }}>Queue View</Link>
            <Link to="/help" onClick={() => setMobileMenuOpen(false)} style={{ color: "#94a3b8", textDecoration: "none", padding: "0.5rem" }}>Help</Link>
            <button onClick={handleLogout} style={{ marginTop: "0.5rem", padding: "0.5rem", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}>Logout</button>
          </nav>
        )}
      </header>

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
