import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f9fafb",
      }}
    >
      {/* Header */}
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
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#2563eb",
            }}
          >
            CourtScheduler
          </div>
          <nav style={{ display: "flex", gap: "1rem" }}>
            <Link
              to="/login"
              style={{
                padding: "0.5rem 1rem",
                color: "#374151",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
              }}
            >
              Login
            </Link>
            <Link
              to="/register"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: "0.375rem",
                fontWeight: 500,
                fontSize: "0.95rem",
              }}
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "3.5rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "1.5rem",
              lineHeight: "1.2",
            }}
          >
            Book Your Court
            <br />
            <span style={{ color: "#2563eb" }}>Anytime, Anywhere</span>
          </h1>
          <p
            style={{
              fontSize: "1.25rem",
              color: "#6b7280",
              marginBottom: "2.5rem",
              lineHeight: "1.6",
            }}
          >
            The easiest way to manage and book badminton courts. Whether you're a player
            looking for available slots or a court owner managing your facilities.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/register"
              style={{
                padding: "0.875rem 2rem",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: "0.5rem",
                fontWeight: 600,
                fontSize: "1.1rem",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                transition: "transform 0.2s, box-shadow 0.2s",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
              }}
            >
              Get Started
            </Link>
            <Link
              to="/login"
              style={{
                padding: "0.875rem 2rem",
                backgroundColor: "#ffffff",
                color: "#374151",
                textDecoration: "none",
                borderRadius: "0.5rem",
                fontWeight: 600,
                fontSize: "1.1rem",
                border: "2px solid #e5e7eb",
                transition: "border-color 0.2s",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2563eb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section
        style={{
          backgroundColor: "#ffffff",
          padding: "4rem 1.5rem",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              color: "#111827",
              textAlign: "center",
              marginBottom: "3rem",
            }}
          >
            Why Choose CourtScheduler?
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "2rem",
            }}
          >
            <div
              style={{
                textAlign: "center",
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "1rem",
                }}
              >
                🏸
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "0.5rem",
                }}
              >
                Easy Booking
              </h3>
              <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                Book courts in just a few clicks. See available slots in real-time and
                confirm your booking instantly.
              </p>
            </div>
            <div
              style={{
                textAlign: "center",
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "1rem",
                }}
              >
                📅
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "0.5rem",
                }}
              >
                Manage Schedules
              </h3>
              <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                Court owners can easily set weekly availability schedules and manage
                multiple courts from one dashboard.
              </p>
            </div>
            <div
              style={{
                textAlign: "center",
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "1rem",
                }}
              >
                ⚡
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "0.5rem",
                }}
              >
                Real-Time Updates
              </h3>
              <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                Get instant updates on booking status. View your upcoming bookings and
                manage them all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
