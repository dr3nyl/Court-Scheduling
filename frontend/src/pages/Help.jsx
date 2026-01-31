import { Link } from "react-router-dom";

const sectionStyle = {
  marginBottom: "2rem",
};
const headingStyle = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#111827",
  marginBottom: "0.75rem",
  paddingBottom: "0.5rem",
  borderBottom: "2px solid #e5e7eb",
};
const listStyle = {
  margin: 0,
  paddingLeft: "1.25rem",
  color: "#374151",
  lineHeight: 1.7,
};
const itemStyle = { marginBottom: "0.5rem" };
const linkStyle = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 500,
};

export default function Help() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <header
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem 0",
          marginBottom: "2rem",
        }}
      >
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/" style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#2563eb", textDecoration: "none" }}>
            CourtScheduler
          </Link>
          <Link to="/" style={{ color: "#6b7280", textDecoration: "none", fontSize: "0.9rem" }}>
            Home
          </Link>
        </div>
      </header>
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 1rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          How it works
        </h1>
        <p style={{ color: "#6b7280", fontSize: "1rem" }}>
          Quick guides for players and venue owners.
        </p>
      </div>

      <section style={sectionStyle}>
        <h2 style={{ ...headingStyle, color: "#2563eb" }}>For players</h2>
        <ul style={listStyle}>
          <li style={itemStyle}>
            <strong>Book a court</strong> — Choose a court, date, and time slot. Your booking is confirmed once submitted.
          </li>
          <li style={itemStyle}>
            <strong>My bookings</strong> — See all your upcoming and past bookings. Cancel from here if your plans change.
          </li>
          <li style={itemStyle}>
            <strong>Queue</strong> — If your venue uses queue sessions, join the queue to get matched for games. The queue master or owner runs the session and assigns courts.
          </li>
        </ul>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/player/book" style={linkStyle}>Book a court →</Link>
          {" · "}
          <Link to="/player/bookings" style={linkStyle}>My bookings →</Link>
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ ...headingStyle, color: "#059669" }}>For venue owners</h2>
        <ul style={listStyle}>
          <li style={itemStyle}>
            <strong>My courts</strong> — Add courts and set names, hourly rates, and reservation fees. Turn courts on or off as needed.
          </li>
          <li style={itemStyle}>
            <strong>Court schedule</strong> — For each court, set weekly opening hours (e.g. Mon–Fri 9am–9pm). Only these slots can be booked.
          </li>
          <li style={itemStyle}>
            <strong>All bookings</strong> — View bookings by schedule, list, or calendar. Cancel bookings, mark payment, and start sessions (e.g. shuttlecock count) from here.
          </li>
          <li style={itemStyle}>
            <strong>Analytics</strong> — See stats for revenue, games played, and cancellations to understand how your venue is doing.
          </li>
          <li style={itemStyle}>
            <strong>Queue master</strong> — Create and run queue sessions, assign courts, and manage the queue for drop-in play.
          </li>
        </ul>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/owner/courts" style={linkStyle}>My courts →</Link>
          {" · "}
          <Link to="/owner/bookings" style={linkStyle}>All bookings →</Link>
          {" · "}
          <Link to="/owner/analytics" style={linkStyle}>Analytics →</Link>
        </p>
      </section>

      <p style={{ color: "#9ca3af", fontSize: "0.9rem", marginTop: "2rem" }}>
        Need more? Contact your venue for court rules, cancellation policy, and payment details.
      </p>
    </div>
    </div>
  );
}
