import { Link } from "react-router-dom";

/**
 * Reusable empty state: icon, title, message, optional CTA (link or text).
 * @param {string} title
 * @param {string} message
 * @param {string} [actionLabel] - e.g. "Book a Court"
 * @param {string} [actionTo] - path for Link (if set, renders Link)
 * @param {React.ReactNode} [children] - extra content below message (e.g. custom button)
 */
export default function EmptyState({ title, message, actionLabel, actionTo, children }) {
  return (
    <div
      style={{
        padding: "3rem 1.5rem",
        backgroundColor: "#ffffff",
        borderRadius: "0.75rem",
        border: "1px solid #e5e7eb",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "2.5rem",
          marginBottom: "1rem",
          opacity: 0.7,
        }}
        aria-hidden
      >
        📭
      </div>
      <p style={{ color: "#374151", marginBottom: "0.5rem", fontSize: "1.1rem", fontWeight: 600 }}>
        {title}
      </p>
      <p style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "1.25rem" }}>
        {message}
      </p>
      {actionTo && actionLabel && (
        <Link
          to={actionTo}
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontWeight: 500,
            fontSize: "0.95rem",
          }}
        >
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  );
}
