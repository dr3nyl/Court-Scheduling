import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import QueueMasterLayout from "../components/QueueMasterLayout";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";

export default function QueueSessionView() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [availableCourts, setAvailableCourts] = useState([]);
  const [allCourts, setAllCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addMode, setAddMode] = useState("guest"); // "guest" | "user"
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearching, setUserSearching] = useState(false);
  const [form, setForm] = useState({ guest_name: "", level: "3.5", phone: "", notes: "", user_id: "", levelOverride: "" });
  const [selectedCourtId, setSelectedCourtId] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState({});
  const [assignLoading, setAssignLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [endingMatchId, setEndingMatchId] = useState(null);
  const [shuttlecocksUsed, setShuttlecocksUsed] = useState("");
  const [manualTeamA, setManualTeamA] = useState([]);
  const [manualTeamB, setManualTeamB] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sorting, setSorting] = useState([]);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError("");
      
      // Use Promise.allSettled to handle partial failures gracefully
      const [sRes, eRes, cRes, allCourtsRes] = await Promise.allSettled([
        api.get(`/queue/sessions/${sessionId}`),
        api.get(`/queue/sessions/${sessionId}/entries`),
        api.get(`/queue/sessions/${sessionId}/available-courts`),
        api.get(`/queue/sessions/${sessionId}/courts`),
      ]);

      // Check if the main session request failed
      if (sRes.status === 'rejected') {
        const error = sRes.reason;
        console.error('Failed to load session:', error);
        
        let errorMessage = "Failed to load session";
        if (error?.response?.status === 404) {
          errorMessage = "Session not found. It may have been deleted or the ID is incorrect.";
        } else if (error?.response?.status === 403) {
          errorMessage = "You don't have permission to view this session.";
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
        setSession(null);
      } else {
        // Session loaded successfully
        setSession(sRes.value.data);
        
        // Handle other requests (they might fail but we still want to show the session)
        if (eRes.status === 'fulfilled') {
          setEntries(eRes.value.data);
        }
        if (cRes.status === 'fulfilled') {
          setAvailableCourts(cRes.value.data);
        }
        if (allCourtsRes.status === 'fulfilled') {
          setAllCourts(allCourtsRes.value.data || []);
        }
      }
    } catch (e) {
      console.error('Unexpected error loading session:', e);
      setError(e?.response?.data?.message || e?.message || "Failed to load session");
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  // User search debounce
  useEffect(() => {
    if (addMode !== "user" || userQuery.length < 2) {
      setUserResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setUserSearching(true);
      try {
        const res = await api.get(`/queue/users?q=${encodeURIComponent(userQuery)}`);
        setUserResults(Array.isArray(res.data) ? res.data : []);
      } catch {
        setUserResults([]);
      } finally {
        setUserSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [addMode, userQuery]);

  async function handleStartSession() {
    try {
      await api.patch(`/queue/sessions/${sessionId}`, { status: "active" });
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to start");
    }
  }

  async function handleEndSession() {
    try {
      await api.patch(`/queue/sessions/${sessionId}`, { status: "ended" });
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to end");
    }
  }

  async function handleAddEntry(e) {
    e.preventDefault();
    setError("");
    try {
      if (addMode === "guest") {
        await api.post(`/queue/sessions/${sessionId}/entries`, {
          guest_name: form.guest_name,
          level: parseFloat(form.level),
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        });
      } else {
        await api.post(`/queue/sessions/${sessionId}/entries`, {
          user_id: Number(form.user_id),
          level: form.levelOverride ? parseFloat(form.levelOverride) : undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        });
      }
      setForm({ guest_name: "", level: "3.5", phone: "", notes: "", user_id: "", levelOverride: "" });
      setUserQuery("");
      setUserResults([]);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add player");
    }
  }

  const handleExit = useCallback(async (entryId) => {
    try {
      await api.patch(`/queue/entries/${entryId}`, { status: "left" });
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update");
    }
  }, [load]);

  const handleRemove = useCallback(async (entryId) => {
    if (!window.confirm("Remove from queue?")) return;
    try {
      await api.delete(`/queue/entries/${entryId}`);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to remove");
    }
  }, [load]);

  async function handleCourtClick(courtId) {
    if (!courtId) return;
    const court = allCourts.find((c) => Number(c.id) === Number(courtId));
    if (court?.status !== "available") return; // Only allow clicking available courts

    setError("");
    setSelectedCourtId(courtId);
    setSuggested([]);
    setManualTeamA([]);
    setManualTeamB([]);
    setShowModal(true);
  }

  async function handleSuggestMatch() {
    if (!selectedCourtId) return;
    setError("");
    setSuggestLoading((prev) => ({ ...prev, [selectedCourtId]: true }));
    setSuggested([]);
    setManualTeamA([]);
    setManualTeamB([]);

    try {
      const res = await api.post(`/queue/sessions/${sessionId}/suggest-match`, { court_id: Number(selectedCourtId) });
      const suggestedPlayers = Array.isArray(res.data?.suggested) ? res.data.suggested : [];
      setSuggested(suggestedPlayers);
      // Auto-populate teams: first 2 = Team A, last 2 = Team B
      if (suggestedPlayers.length === 4) {
        setManualTeamA(suggestedPlayers.slice(0, 2).map(s => s.queue_entry_id));
        setManualTeamB(suggestedPlayers.slice(2, 4).map(s => s.queue_entry_id));
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to suggest match");
    } finally {
      setSuggestLoading((prev) => ({ ...prev, [selectedCourtId]: false }));
    }
  }

  async function handleAssignMatch() {
    if (!selectedCourtId) return;
    
    // Check if we have manual selection or suggested match
    const teamAIds = manualTeamA;
    const teamBIds = manualTeamB;
    
    if (teamAIds.length !== 2 || teamBIds.length !== 2) {
      setError("Please select exactly 2 players for Team A and 2 players for Team B");
      return;
    }

    setError("");
    setAssignLoading(true);
    try {
      await api.post("/queue/matches", {
        queue_session_id: Number(sessionId),
        court_id: Number(selectedCourtId),
        teamA: teamAIds,
        teamB: teamBIds,
      });
      setSuggested([]);
      setManualTeamA([]);
      setManualTeamB([]);
      setSelectedCourtId(null);
      setShowModal(false);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to assign match");
    } finally {
      setAssignLoading(false);
    }
  }

  function togglePlayerInTeam(entryId, team) {
    if (team === 'A') {
      setManualTeamA(prev => {
        if (prev.includes(entryId)) {
          return prev.filter(id => id !== entryId);
        } else if (prev.length < 2) {
          return [...prev, entryId];
        }
        return prev;
      });
    } else {
      setManualTeamB(prev => {
        if (prev.includes(entryId)) {
          return prev.filter(id => id !== entryId);
        } else if (prev.length < 2) {
          return [...prev, entryId];
        }
        return prev;
      });
    }
  }

  function handleCloseModal() {
    setShowModal(false);
    setSelectedCourtId(null);
    setSuggested([]);
    setManualTeamA([]);
    setManualTeamB([]);
  }

  function handleEndMatchClick(matchId) {
    setEndingMatchId(matchId);
    setShuttlecocksUsed("");
    setShowEndMatchModal(true);
  }

  async function handleEndMatch() {
    if (!endingMatchId) return;
    setError("");
    try {
      await api.patch(`/queue/matches/${endingMatchId}`, {
        status: "completed",
        shuttlecocks_used: shuttlecocksUsed ? Number(shuttlecocksUsed) : null,
      });
      setShowEndMatchModal(false);
      setEndingMatchId(null);
      setShuttlecocksUsed("");
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to end match");
    }
  }

  function pickUser(u) {
    setForm((f) => ({ ...f, user_id: u.id, levelOverride: u.level != null ? String(u.level) : "" }));
    setUserQuery(u.name);
    setUserResults([]);
  }

  function displayName(entry) {
    return entry.user_id ? (entry.user?.name || "") : (entry.guest_name || "");
  }

  // Define columns for TanStack Table
  const columns = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => displayName(row),
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div>
              <span style={{ fontWeight: 600, color: "#111827" }}>{displayName(entry)}</span>
              {entry.user_id && (
                <span style={{ color: "#6b7280", fontSize: "0.75rem", marginLeft: "0.5rem" }}>(User)</span>
              )}
              {!entry.user_id && (
                <span style={{ color: "#6b7280", fontSize: "0.75rem", marginLeft: "0.5rem" }}>(Guest)</span>
              )}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "level",
        header: "Level",
        cell: ({ getValue }) => (
          <span style={{ color: "#374151" }}>{getValue()}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <span
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                backgroundColor:
                  status === "waiting" ? "#dbeafe" :
                  status === "playing" ? "#fef3c7" :
                  status === "left" ? "#fee2e2" :
                  "#e5e7eb",
                color:
                  status === "waiting" ? "#1e40af" :
                  status === "playing" ? "#92400e" :
                  status === "left" ? "#b91c1c" :
                  "#374151",
              }}
            >
              {status}
            </span>
          );
        },
        enableSorting: true,
        filterFn: (row, id, value) => {
          if (value === "all") return true;
          return row.getValue(id) === value;
        },
      },
      {
        accessorKey: "games_played",
        header: "Games Played",
        cell: ({ getValue }) => {
          const games = getValue();
          return games != null && games > 0 ? (
            <span style={{ color: "#059669", fontWeight: 500 }}>{games}</span>
          ) : (
            <span style={{ color: "#9ca3af" }}>0</span>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ getValue }) => (
          <span style={{ color: "#6b7280" }}>{getValue() || "-"}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const entry = row.original;
          return (
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              {!["left", "done"].includes(entry.status) ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleExit(entry.id)}
                    style={{
                      padding: "0.35rem 0.65rem",
                      fontSize: "0.8rem",
                      backgroundColor: "#fef3c7",
                      color: "#92400e",
                      border: "none",
                      borderRadius: "0.375rem",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Exit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.id)}
                    style={{
                      padding: "0.35rem 0.65rem",
                      fontSize: "0.8rem",
                      backgroundColor: "#fee2e2",
                      color: "#b91c1c",
                      border: "none",
                      borderRadius: "0.375rem",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>-</span>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [handleExit, handleRemove]
  );

  // Filter and prepare data
  const filteredData = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch = searchQuery === "" || 
        displayName(entry).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [entries, searchQuery, statusFilter]);

  // Setup TanStack Table
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (loading && !session) {
    return (
      <QueueMasterLayout>
        <p style={{ color: "#6b7280" }}>Loading…</p>
      </QueueMasterLayout>
    );
  }

  if (!session) {
    return (
      <QueueMasterLayout>
        <div style={{ color: "#b91c1c" }}>
          {error || "Session not found."}
        </div>
        <Link to="/queue-master" style={{ color: "#059669", marginTop: "0.5rem", display: "inline-block" }}>← Back to sessions</Link>
      </QueueMasterLayout>
    );
  }

  const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <QueueMasterLayout>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link to="/queue-master" style={{ color: "#059669", textDecoration: "none", fontSize: "0.9rem", marginBottom: "0.5rem", display: "inline-block" }}>← Sessions</Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#111827" }}>
          {formatDate(session.date)} · {String(session.start_time).slice(0, 5)}
        </h1>
        <div style={{ color: "#6b7280", fontSize: "0.95rem" }}>
          {session.owner?.name && `Owner: ${session.owner.name} · `} Status: <strong>{session.status}</strong>
          {availableCourts.length > 0 && ` · ${availableCourts.length} court(s) free`}
          {session.completed_matches_count != null && session.completed_matches_count > 0 && ` · ${session.completed_matches_count} game(s) played`}
        </div>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem", color: "#b91c1c", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Start / End session */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}>
        {session.status === "upcoming" && (
          <button
            type="button"
            onClick={handleStartSession}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer" }}
          >
            Start session
          </button>
        )}
        {session.status === "active" && (
          <button
            type="button"
            onClick={handleEndSession}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer" }}
          >
            End session
          </button>
        )}
      </div>

      {/* Courts Grid - Visual Court Selection */}
      {session.status === "active" && allCourts.length > 0 && (
        <div style={{ marginBottom: "1.5rem", padding: "1.5rem", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.75rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>Courts</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem" }}>
            {allCourts.map((court) => {
              const isAvailable = court.status === "available";
              const isLoading = suggestLoading[court.id];
              const isInUse = court.status === "in-use";
              const courtMatch = court.match;

              return (
                <div
                  key={court.id}
                  onClick={() => isAvailable && !isLoading && handleCourtClick(court.id)}
                  style={{
                    position: "relative",
                    padding: "2rem 1.5rem",
                    backgroundColor: isInUse ? "#fee2e2" : isAvailable ? "#d1fae5" : "#f3f4f6",
                    border: `2px solid ${isInUse ? "#f87171" : isAvailable ? "#10b981" : "#9ca3af"}`,
                    borderRadius: "0.75rem",
                    cursor: isAvailable && !isLoading ? "pointer" : "not-allowed",
                    opacity: isLoading ? 0.7 : 1,
                    transition: "all 0.2s",
                    textAlign: "center",
                    minHeight: "180px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (isAvailable && !isLoading) {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {isLoading && (
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "1.5rem" }}>
                      ⏳
                    </div>
                  )}
                  <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
                    {isInUse ? "🏸" : "🏟️"}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "1.25rem", color: "#111827", marginBottom: "0.5rem" }}>
                    {court.name}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: isInUse ? "#b91c1c" : isAvailable ? "#059669" : "#6b7280", fontWeight: 500, marginBottom: "0.5rem" }}>
                    {isInUse ? "In Use" : isAvailable ? "Available" : "Unavailable"}
                  </div>
                  {isInUse && courtMatch && (
                    <>
                      <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#374151", lineHeight: "1.5", width: "100%" }}>
                        {courtMatch.teamA && courtMatch.teamB ? (
                          <>
                            <div style={{ marginBottom: "0.5rem" }}>
                              <span style={{ fontWeight: 600, color: "#059669" }}>Team A:</span> {courtMatch.teamA.join(" & ")}
                            </div>
                            <div style={{ marginBottom: "0.5rem", fontSize: "0.7rem", color: "#6b7280" }}>vs</div>
                            <div style={{ marginBottom: "0.5rem" }}>
                              <span style={{ fontWeight: 600, color: "#dc2626" }}>Team B:</span> {courtMatch.teamB.join(" & ")}
                            </div>
                          </>
                        ) : (
                          // Fallback to flat list if teams not available
                          courtMatch.players?.map((name, idx) => (
                            <div key={idx} style={{ marginBottom: "0.25rem" }}>
                              {name}
                            </div>
                          ))
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEndMatchClick(courtMatch.id);
                        }}
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.5rem 1rem",
                          fontSize: "0.875rem",
                          backgroundColor: "#059669",
                          color: "#fff",
                          border: "none",
                          borderRadius: "0.375rem",
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        End Match
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal for Suggested Match */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "2rem",
              borderRadius: "0.75rem",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827" }}>
                Assign match to {allCourts.find((c) => Number(c.id) === Number(selectedCourtId))?.name || "Court"}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#6b7280" }}
              >
                ×
              </button>
            </div>

            {suggestLoading[selectedCourtId] ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Finding match...</div>
            ) : (
              <>
                {/* Suggest Match Button */}
                <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={handleSuggestMatch}
                    disabled={suggestLoading[selectedCourtId]}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontWeight: 600,
                      cursor: suggestLoading[selectedCourtId] ? "not-allowed" : "pointer",
                      fontSize: "0.95rem",
                    }}
                  >
                    {suggestLoading[selectedCourtId] ? "Finding Match..." : "Suggest Match"}
                  </button>
                </div>

                {/* Suggested Match Display */}
                {suggested.length === 4 && (
                  <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "0.5rem" }}>
                    <div style={{ fontSize: "0.875rem", color: "#1e40af", marginBottom: "0.5rem", fontWeight: 600 }}>Suggested Match:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      {suggested.map((s, idx) => (
                        <div key={s.queue_entry_id} style={{ fontSize: "0.875rem", color: "#1e3a8a" }}>
                          {idx < 2 ? "Team A: " : "Team B: "}{s.name} (Level {s.level})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Team Selection */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.75rem", fontWeight: 600 }}>
                    Or manually select players (only waiting players available):
                  </div>
                  
                  {/* Team A */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#059669", marginBottom: "0.5rem" }}>
                      Team A ({manualTeamA.length}/2)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minHeight: "80px", padding: "0.75rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.5rem" }}>
                      {manualTeamA.map(entryId => {
                        const entry = entries.find(e => e.id === entryId);
                        if (!entry) return null;
                        return (
                          <div
                            key={entryId}
                            style={{
                              padding: "0.5rem",
                              backgroundColor: "#fff",
                              border: "1px solid #86efac",
                              borderRadius: "0.375rem",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 500, color: "#111827" }}>{displayName(entry)}</span>
                              <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>Level {entry.level}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => togglePlayerInTeam(entryId, 'A')}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", backgroundColor: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "0.25rem", cursor: "pointer" }}
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                      {manualTeamA.length === 0 && (
                        <div style={{ color: "#6b7280", fontSize: "0.875rem", fontStyle: "italic" }}>No players selected</div>
                      )}
                    </div>
                  </div>

                  {/* Team B */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#dc2626", marginBottom: "0.5rem" }}>
                      Team B ({manualTeamB.length}/2)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minHeight: "80px", padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem" }}>
                      {manualTeamB.map(entryId => {
                        const entry = entries.find(e => e.id === entryId);
                        if (!entry) return null;
                        return (
                          <div
                            key={entryId}
                            style={{
                              padding: "0.5rem",
                              backgroundColor: "#fff",
                              border: "1px solid #fca5a5",
                              borderRadius: "0.375rem",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 500, color: "#111827" }}>{displayName(entry)}</span>
                              <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>Level {entry.level}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => togglePlayerInTeam(entryId, 'B')}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", backgroundColor: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "0.25rem", cursor: "pointer" }}
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                      {manualTeamB.length === 0 && (
                        <div style={{ color: "#6b7280", fontSize: "0.875rem", fontStyle: "italic" }}>No players selected</div>
                      )}
                    </div>
                  </div>

                  {/* Available Players List */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                      Available Players (waiting only):
                    </div>
                    <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {entries.filter(e => e.status === "waiting").map((entry) => {
                        const isInTeamA = manualTeamA.includes(entry.id);
                        const isInTeamB = manualTeamB.includes(entry.id);
                        const isSelected = isInTeamA || isInTeamB;
                        const canAddToA = !isSelected && manualTeamA.length < 2;
                        const canAddToB = !isSelected && manualTeamB.length < 2;

                        return (
                          <div
                            key={entry.id}
                            style={{
                              padding: "0.75rem",
                              backgroundColor: isSelected ? "#f3f4f6" : "#fff",
                              border: `1px solid ${isSelected ? "#d1d5db" : "#e5e7eb"}`,
                              borderRadius: "0.5rem",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              opacity: isSelected ? 0.6 : 1,
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 500, color: "#111827" }}>{displayName(entry)}</span>
                              <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>Level {entry.level}</span>
                              {isInTeamA && <span style={{ color: "#059669", marginLeft: "0.5rem", fontWeight: 600 }}>(Team A)</span>}
                              {isInTeamB && <span style={{ color: "#dc2626", marginLeft: "0.5rem", fontWeight: 600 }}>(Team B)</span>}
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              {canAddToA && (
                                <button
                                  type="button"
                                  onClick={() => togglePlayerInTeam(entry.id, 'A')}
                                  style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem", backgroundColor: "#d1fae5", color: "#059669", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 500 }}
                                >
                                  Add to A
                                </button>
                              )}
                              {canAddToB && (
                                <button
                                  type="button"
                                  onClick={() => togglePlayerInTeam(entry.id, 'B')}
                                  style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontWeight: 500 }}
                                >
                                  Add to B
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {entries.filter(e => e.status === "waiting").length === 0 && (
                        <div style={{ padding: "1rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
                          No waiting players available
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    style={{ padding: "0.5rem 1rem", backgroundColor: "#f3f4f6", color: "#374151", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignMatch}
                    disabled={assignLoading || manualTeamA.length !== 2 || manualTeamB.length !== 2}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: manualTeamA.length === 2 && manualTeamB.length === 2 ? "#059669" : "#9ca3af",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontWeight: 500,
                      cursor: assignLoading || (manualTeamA.length !== 2 || manualTeamB.length !== 2) ? "not-allowed" : "pointer",
                    }}
                  >
                    {assignLoading ? "Assigning…" : "Assign Match"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal for Ending Match */}
      {showEndMatchModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setShowEndMatchModal(false);
            setEndingMatchId(null);
            setShuttlecocksUsed("");
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "2rem",
              borderRadius: "0.75rem",
              maxWidth: "400px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111827" }}>End Match</h3>
              <button
                type="button"
                onClick={() => {
                  setShowEndMatchModal(false);
                  setEndingMatchId(null);
                  setShuttlecocksUsed("");
                }}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#6b7280" }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.5rem" }}>
                Shuttlecocks Used (optional)
              </label>
              <input
                type="number"
                min="0"
                value={shuttlecocksUsed}
                onChange={(e) => setShuttlecocksUsed(e.target.value)}
                placeholder="Enter number"
                style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setShowEndMatchModal(false);
                  setEndingMatchId(null);
                  setShuttlecocksUsed("");
                }}
                style={{ padding: "0.5rem 1rem", backgroundColor: "#f3f4f6", color: "#374151", border: "none", borderRadius: "0.375rem", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndMatch}
                style={{ padding: "0.5rem 1rem", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "0.375rem", fontWeight: 500, cursor: "pointer" }}
              >
                End Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add player */}
      <div style={{ marginBottom: "1.5rem", padding: "1.5rem", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.75rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "#111827" }}>Add player</h3>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={() => setAddMode("guest")}
            style={{
              padding: "0.4rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              background: addMode === "guest" ? "#d1fae5" : "#fff",
              cursor: "pointer",
              fontWeight: addMode === "guest" ? 600 : 400,
            }}
          >
            Guest
          </button>
          <button
            type="button"
            onClick={() => setAddMode("user")}
            style={{
              padding: "0.4rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              background: addMode === "user" ? "#d1fae5" : "#fff",
              cursor: "pointer",
              fontWeight: addMode === "user" ? 600 : 400,
            }}
          >
            User
          </button>
        </div>

        <form onSubmit={handleAddEntry} style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
          {addMode === "guest" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Name</label>
                <input
                  value={form.guest_name}
                  onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
                  required
                  placeholder="Guest name"
                  style={{ width: "180px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Level</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="7"
                  value={form.level}
                  onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                  required
                  style={{ width: "80px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
                />
              </div>
            </>
          )}

          {addMode === "user" && (
            <>
              <div style={{ position: "relative" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Search user</label>
                <input
                  value={userQuery}
                  onChange={(e) => { setUserQuery(e.target.value); setForm((f) => ({ ...f, user_id: "" })); }}
                  placeholder="Type name or email…"
                  style={{ width: "220px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
                />
                {userSearching && <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#6b7280" }}>Searching…</span>}
                {userResults.length > 0 && (
                  <ul style={{ position: "absolute", top: "100%", left: 0, right: 0, margin: 0, padding: "0.25rem 0", listStyle: "none", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.375rem", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", zIndex: 10 }}>
                    {userResults.map((u) => (
                      <li key={u.id}>
                        <button type="button" onClick={() => pickUser(u)} style={{ width: "100%", textAlign: "left", padding: "0.5rem 0.75rem", border: "none", background: "none", cursor: "pointer", fontSize: "0.9rem" }}>
                          {u.name} {u.level != null ? `(${u.level})` : ""}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {form.user_id && (
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Level override</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="7"
                    value={form.levelOverride}
                    onChange={(e) => setForm((f) => ({ ...f, levelOverride: e.target.value }))}
                    placeholder="From profile"
                    style={{ width: "90px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }}
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Phone (opt)</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={{ width: "140px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>Notes (opt)</label>
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ width: "160px", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem" }} />
          </div>
          <button
            type="submit"
            disabled={addMode === "user" && !form.user_id}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "0.375rem", fontWeight: 500, cursor: form.user_id || addMode === "guest" ? "pointer" : "not-allowed", opacity: addMode === "user" && !form.user_id ? 0.6 : 1 }}
          >
            Add
          </button>
        </form>
      </div>

      {/* Queue / entries */}
      <div style={{ padding: "1.5rem", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#111827", margin: 0 }}>
            Queue ({entries.length})
          </h3>
          
          {/* Search and Filter Controls */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                style={{
                  padding: "0.5rem 0.75rem",
                  paddingLeft: "2.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  width: "200px",
                }}
              />
              <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}>🔍</span>
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                backgroundColor: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="all">All Status</option>
              <option value="waiting">Waiting</option>
              <option value="playing">Playing</option>
              <option value="left">Left</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {entries.length === 0 ? (
          <p style={{ color: "#6b7280", padding: "1.5rem", textAlign: "center" }}>No players yet. Add a guest or user above.</p>
        ) : filteredData.length === 0 ? (
          <p style={{ color: "#6b7280", padding: "1.5rem", textAlign: "center" }}>
            No players match your search criteria.
          </p>
        ) : (
          <>
            {/* Results Count */}
            <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
              Showing {table.getRowModel().rows.length} of {filteredData.length} players
              {filteredData.length !== entries.length && ` (${entries.length} total)`}
            </div>
            
            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          style={{
                            padding: "0.75rem",
                            textAlign: header.id === "actions" ? "right" : "left",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "#374151",
                            cursor: header.column.getCanSort() ? "pointer" : "default",
                            userSelect: "none",
                          }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && (
                              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                {{
                                  asc: " ↑",
                                  desc: " ↓",
                                }[header.column.getIsSorted()] ?? " ⇅"}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                        backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb",
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          style={{
                            padding: "0.75rem",
                            fontSize: "0.875rem",
                            textAlign: cell.column.id === "actions" ? "right" : "left",
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    backgroundColor: table.getCanPreviousPage() ? "#f3f4f6" : "#f9fafb",
                    color: table.getCanPreviousPage() ? "#374151" : "#9ca3af",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    cursor: table.getCanPreviousPage() ? "pointer" : "not-allowed",
                  }}
                >
                  {"<<"}
                </button>
                <button
                  type="button"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    backgroundColor: table.getCanPreviousPage() ? "#f3f4f6" : "#f9fafb",
                    color: table.getCanPreviousPage() ? "#374151" : "#9ca3af",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    cursor: table.getCanPreviousPage() ? "pointer" : "not-allowed",
                  }}
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    backgroundColor: table.getCanNextPage() ? "#f3f4f6" : "#f9fafb",
                    color: table.getCanNextPage() ? "#374151" : "#9ca3af",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    cursor: table.getCanNextPage() ? "pointer" : "not-allowed",
                  }}
                >
                  {">"}
                </button>
                <button
                  type="button"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    backgroundColor: table.getCanNextPage() ? "#f3f4f6" : "#f9fafb",
                    color: table.getCanNextPage() ? "#374151" : "#9ca3af",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    cursor: table.getCanNextPage() ? "pointer" : "not-allowed",
                  }}
                >
                  {">>"}
                </button>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {[10, 20, 30, 50].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      Show {pageSize}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </div>

    </QueueMasterLayout>
  );
}
