/**
 * Filter tabs and search/quick filters for bookings.
 * Presentational component — receives all state and handlers via props.
 */
export default function BookingFilters({
  isMobile,
  filter,
  onFilterChange,
  tabs,
  datePickerValue,
  onDatePickerChange,
  onTodayClick,
  onThisWeekClick,
  thisWeekOnly,
  onJumpToToday,
  dateSearch,
  onSearchChange,
  hasActiveFilters,
  onClearFilters,
}) {
  return (
    <>
      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid #e5e7eb",
          flexWrap: "wrap",
          overflowX: isMobile ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            style={{
              padding: isMobile ? "0.5rem 1rem" : "0.75rem 1.25rem",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: filter === tab.key ? "2px solid #2563eb" : "2px solid transparent",
              color: filter === tab.key ? "#2563eb" : "#6b7280",
              fontWeight: filter === tab.key ? 600 : 500,
              cursor: "pointer",
              fontSize: isMobile ? "0.85rem" : "0.95rem",
              marginBottom: "-1px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  padding: "0.15rem 0.5rem",
                  backgroundColor: filter === tab.key ? "#dbeafe" : "#f3f4f6",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & quick filters */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="date"
          value={datePickerValue}
          onChange={(e) => onDatePickerChange(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            fontSize: isMobile ? "0.85rem" : "0.9rem",
            minWidth: isMobile ? "130px" : "150px",
          }}
        />
        <button
          type="button"
          onClick={onTodayClick}
          style={{
            padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1rem",
            backgroundColor: "#f3f4f6",
            color: "#374151",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: isMobile ? "0.85rem" : "0.9rem",
            whiteSpace: "nowrap",
          }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={onThisWeekClick}
          style={{
            padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1rem",
            backgroundColor: thisWeekOnly ? "#dbeafe" : "#f3f4f6",
            color: thisWeekOnly ? "#1e40af" : "#374151",
            border: `1px solid ${thisWeekOnly ? "#93c5fd" : "#e5e7eb"}`,
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: isMobile ? "0.85rem" : "0.9rem",
            whiteSpace: "nowrap",
          }}
        >
          This Week
        </button>
        <button
          type="button"
          onClick={onJumpToToday}
          style={{
            padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1rem",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: isMobile ? "0.85rem" : "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            whiteSpace: "nowrap",
          }}
        >
          <span aria-hidden>📅</span>
          {!isMobile && "Jump to Today"}
        </button>
        <input
          type="text"
          placeholder="Search by date..."
          value={dateSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            flex: 1,
            minWidth: isMobile ? "120px" : "180px",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            fontSize: isMobile ? "0.85rem" : "0.9rem",
          }}
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            style={{
              padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1rem",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: isMobile ? "0.85rem" : "0.9rem",
              whiteSpace: "nowrap",
            }}
          >
            Clear
          </button>
        )}
      </div>
    </>
  );
}
