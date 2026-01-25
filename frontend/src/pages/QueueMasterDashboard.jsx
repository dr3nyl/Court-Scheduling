/**
 * Queue Master Dashboard (placeholder).
 * Queueing features (sessions, entries, courts, matches) will be built in later steps.
 */
export default function QueueMasterDashboard() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          padding: "2.5rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111827", marginBottom: "0.5rem" }}>
          Queue Master
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
          Queue sessions, player registration, and match assignment will be available here soon.
        </p>
      </div>
    </div>
  );
}
