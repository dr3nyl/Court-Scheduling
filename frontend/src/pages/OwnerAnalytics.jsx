import { useState, useEffect } from "react";
import api from "../services/api";
import OwnerLayout from "../components/OwnerLayout";

export default function OwnerAnalytics() {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");
      
      let url = "/owner/analytics";
      const params = [];
      
      if (startDate) {
        params.push(`start_date=${startDate}`);
      }
      if (endDate) {
        params.push(`end_date=${endDate}`);
      }
      
      if (params.length > 0) {
        url += "?" + params.join("&");
      }

      const res = await api.get(url);
      setAnalytics(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch (err) {
      console.error(err);
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const res = await api.get("/owner/reports/export?" + params.toString(), { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report_${startDate || "start"}_${endDate || "end"}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Failed to export report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <OwnerLayout>
      {/* Page Header */}
      <div style={{ marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <h1 style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          Daily Analytics
        </h1>
        <p style={{ color: "#6b7280", fontSize: isMobile ? "0.9rem" : "1rem" }}>
          Track revenue, games played, and cancellations
        </p>
      </div>

      {/* Date Filters */}
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "1.5rem",
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "1rem",
          alignItems: isMobile ? "stretch" : "end",
        }}
      >
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#374151",
              marginBottom: "0.5rem",
            }}
          >
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.9rem",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#374151",
              marginBottom: "0.5rem",
            }}
          >
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.9rem",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.375rem",
              cursor: exporting ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
              opacity: exporting ? 0.7 : 1,
            }}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          <button
            onClick={handleResetFilters}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.5rem",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {/* Analytics Table */}
      {loading ? (
        <div
          style={{
            padding: "3rem",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#6b7280" }}>Loading analytics...</p>
        </div>
      ) : analytics.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#6b7280" }}>No data available for the selected date range.</p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            overflowX: isMobile ? "auto" : "visible",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: isMobile ? "600px" : "auto",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th
                  style={{
                    padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                    textAlign: "left",
                    fontSize: isMobile ? "0.8rem" : "0.875rem",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                    textAlign: "right",
                    fontSize: isMobile ? "0.8rem" : "0.875rem",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Revenue
                </th>
                <th
                  style={{
                    padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                    textAlign: "right",
                    fontSize: isMobile ? "0.8rem" : "0.875rem",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Games Played
                </th>
                <th
                  style={{
                    padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                    textAlign: "right",
                    fontSize: isMobile ? "0.8rem" : "0.875rem",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Cancelled
                </th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((day, index) => (
                <tr
                  key={day.date}
                  style={{
                    borderBottom: index < analytics.length - 1 ? "1px solid #e5e7eb" : "none",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td
                    style={{
                      padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                      fontSize: isMobile ? "0.85rem" : "0.9rem",
                      color: "#111827",
                    }}
                  >
                    {formatDate(day.date)}
                  </td>
                  <td
                    style={{
                      padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                      textAlign: "right",
                      fontSize: isMobile ? "0.85rem" : "0.9rem",
                      fontWeight: 600,
                      color: "#16a34a",
                    }}
                  >
                    {formatCurrency(day.revenue)}
                  </td>
                  <td
                    style={{
                      padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                      textAlign: "right",
                      fontSize: isMobile ? "0.85rem" : "0.9rem",
                      color: "#2563eb",
                    }}
                  >
                    {day.games_played}
                  </td>
                  <td
                    style={{
                      padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                      textAlign: "right",
                      fontSize: isMobile ? "0.85rem" : "0.9rem",
                      color: day.cancelled > 0 ? "#dc2626" : "#6b7280",
                    }}
                  >
                    {day.cancelled}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                <td
                  style={{
                    padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                    fontSize: isMobile ? "0.85rem" : "0.9rem",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Total
                </td>
                <td
                  style={{
                    padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                    textAlign: "right",
                    fontSize: isMobile ? "0.85rem" : "0.9rem",
                    fontWeight: 600,
                    color: "#16a34a",
                  }}
                >
                  {formatCurrency(analytics.reduce((sum, day) => sum + day.revenue, 0))}
                </td>
                <td
                  style={{
                    padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                    textAlign: "right",
                    fontSize: isMobile ? "0.85rem" : "0.9rem",
                    fontWeight: 600,
                    color: "#2563eb",
                  }}
                >
                  {analytics.reduce((sum, day) => sum + day.games_played, 0)}
                </td>
                <td
                  style={{
                    padding: isMobile ? "0.75rem 0.5rem" : "1rem",
                    textAlign: "right",
                    fontSize: isMobile ? "0.85rem" : "0.9rem",
                    fontWeight: 600,
                    color: "#dc2626",
                  }}
                >
                  {analytics.reduce((sum, day) => sum + day.cancelled, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </OwnerLayout>
  );
}
