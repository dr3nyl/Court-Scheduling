<?php

namespace App\Http\Controllers;

use App\Models\Court;
use App\Models\QueueEntry;
use App\Models\QueueSession;
use Illuminate\Http\Request;

class QueueSessionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = QueueSession::with('owner:id,name')->orderBy('date', 'desc')->orderBy('start_time', 'desc');

        if ($user->role === 'owner') {
            $query->where('owner_id', $user->id);
        }
        if ($user->role === 'queue_master' && $request->has('owner_id')) {
            $query->where('owner_id', $request->owner_id);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $ownerId = $user->role === 'owner' ? $user->id : $request->input('owner_id');

        if ($user->role === 'queue_master' && ! $ownerId) {
            return response()->json(['message' => 'owner_id is required for queue_master'], 422);
        }

        $request->validate([
            'date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
        ]);

        $data = [
            'owner_id' => $ownerId,
            'date' => $request->date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'status' => 'upcoming',
        ];

        return QueueSession::create($data);
    }

    public function show(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        $session->load([
            'owner:id,name',
            'entries' => fn ($q) => $q->with('user:id,name')->orderBy('joined_at'),
            'matches' => fn ($q) => $q->where('status', 'active')->with([
                'court:id,name',
                'queueMatchPlayers' => fn ($q) => $q->with(['queueEntry' => fn ($eq) => $eq->with('user:id,name')]),
            ]),
        ]);

        // Add count of completed matches
        $session->completed_matches_count = $session->matches()
            ->where('status', 'completed')
            ->count();

        return $session;
    }

    public function update(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        $request->validate([
            'status' => 'sometimes|in:upcoming,active,ended',
            'end_time' => 'nullable|date_format:H:i',
        ]);

        $session->update($request->only(['status', 'end_time']));

        return $session;
    }

    public function availableCourts(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        return Court::where('owner_id', $session->owner_id)
            ->where(fn ($q) => $q->whereNull('is_active')->orWhere('is_active', true))
            ->whereDoesntHave('queueMatches', function ($q) use ($session) {
                $q->where('queue_session_id', $session->id)->where('status', 'active');
            })
            ->get(['id', 'name']);
    }

    /**
     * Get all courts with their status (available or in-use) for visual display.
     */
    public function allCourts(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        $courts = Court::where('owner_id', $session->owner_id)
            ->where(fn ($q) => $q->whereNull('is_active')->orWhere('is_active', true))
            ->get(['id', 'name']);

        // Get active matches for this session with players
        $activeMatches = \App\Models\QueueMatch::where('queue_session_id', $session->id)
            ->where('status', 'active')
            ->with([
                'court:id,name',
                'queueMatchPlayers' => fn ($q) => $q->orderBy('team')->orderBy('id')->with(['queueEntry' => fn ($eq) => $eq->with('user:id,name')]),
            ])
            ->get();

        $courtStatusMap = [];
        foreach ($activeMatches as $match) {
            $teamA = [];
            $teamB = [];
            
            // Order by team, then by id to ensure consistent ordering
            $sortedPlayers = $match->queueMatchPlayers->sortBy(function ($qmp) {
                return ($qmp->team ?? 'A') . '_' . $qmp->id;
            });
            
            foreach ($sortedPlayers as $qmp) {
                $e = $qmp->queueEntry;
                $name = $e ? ($e->user?->name ?? $e->guest_name ?? '') : '';
                if ($name) {
                    // Check team value (handle both string and null cases)
                    $team = $qmp->team ?? null;
                    // If team is null or empty, assign based on position (for old records)
                    if (empty($team)) {
                        // For old records without team, split by position
                        $total = count($match->queueMatchPlayers);
                        $currentIndex = $sortedPlayers->values()->search($qmp);
                        $team = $currentIndex < ($total / 2) ? 'A' : 'B';
                    }
                    
                    if (strtoupper($team) === 'A' || $team === 'A') {
                        $teamA[] = $name;
                    } else {
                        $teamB[] = $name;
                    }
                }
            }

            $courtStatusMap[$match->court_id] = [
                'id' => $match->id,
                'players' => array_merge($teamA, $teamB), // Keep flat list for backward compatibility
                'teamA' => $teamA,
                'teamB' => $teamB,
            ];
        }

        return $courts->map(function ($court) use ($courtStatusMap) {
            $match = $courtStatusMap[$court->id] ?? null;
            return [
                'id' => $court->id,
                'name' => $court->name,
                'status' => $match ? 'in-use' : 'available',
                'match' => $match,
            ];
        });
    }

    /**
     * Suggest 4 players for a match (level-based, max spread 1.0). Doubles only.
     * Body: { "court_id": int }. Returns { "suggested": [ { "queue_entry_id", "level", "name" } ] }.
     */
    public function suggestMatch(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        $request->validate(['court_id' => 'required|exists:courts,id']);
        $courtId = (int) $request->court_id;

        $availableCourtIds = Court::where('owner_id', $session->owner_id)
            ->where(fn ($q) => $q->whereNull('is_active')->orWhere('is_active', true))
            ->whereDoesntHave('queueMatches', function ($q) use ($session) {
                $q->where('queue_session_id', $session->id)->where('status', 'active');
            })
            ->pluck('id')
            ->all();
        if (! in_array($courtId, $availableCourtIds, true)) {
            return response()->json(['message' => 'Court is not available for this session.'], 422);
        }

        // Sort by: lowest games_played first, then FIFO (joined_at)
        $waiting = QueueEntry::where('queue_session_id', $session->id)
            ->where('status', 'waiting')
            ->with('user:id,name')
            ->orderBy('games_played', 'asc')
            ->orderBy('joined_at', 'asc')
            ->get();

        if ($waiting->count() < 4) {
            return response()->json(['suggested' => []]);
        }

        $list = $waiting->values()->all();

        // Helper: get bracket from numeric level
        $getBracket = function ($level) {
            $l = (float) $level;
            if ($l <= 2.5) return 'beginner';
            if ($l <= 4.5) return 'intermediate';
            return 'advanced';
        };

        // Helper: check if 4 players can form balanced doubles teams
        $isBalancedDoubles = function ($players) use ($getBracket) {
            $brackets = array_map(fn ($p) => $getBracket($p->level), $players);
            $levels = array_map(fn ($p) => (float) $p->level, $players);

            // All same bracket = always balanced
            if (count(array_unique($brackets)) === 1) {
                return true;
            }

            // Mixed brackets: check if we can form balanced teams
            // Try pairing: Team A = [0,1], Team B = [2,3] and check if averages are close
            $avgA1 = ($levels[0] + $levels[1]) / 2;
            $avgB1 = ($levels[2] + $levels[3]) / 2;
            $diff1 = abs($avgA1 - $avgB1);

            // Try pairing: Team A = [0,2], Team B = [1,3]
            $avgA2 = ($levels[0] + $levels[2]) / 2;
            $avgB2 = ($levels[1] + $levels[3]) / 2;
            $diff2 = abs($avgA2 - $avgB2);

            // Try pairing: Team A = [0,3], Team B = [1,2]
            $avgA3 = ($levels[0] + $levels[3]) / 2;
            $avgB3 = ($levels[1] + $levels[2]) / 2;
            $diff3 = abs($avgA3 - $avgB3);

            // Balanced if any pairing has average difference <= 0.5
            $minDiff = min($diff1, $diff2, $diff3);
            return $minDiff <= 0.5;
        };

        // Try all combinations of 4 players (prioritize earlier in queue)
        // For performance, check consecutive groups first, then try all combinations
        $best = null;

        // First: try consecutive groups (FIFO with games_played priority)
        for ($i = 0; $i <= count($list) - 4; $i++) {
            $group = array_slice($list, $i, 4);
            if ($isBalancedDoubles($group)) {
                $best = $group;
                break;
            }
        }

        // If no consecutive match, try all combinations (still prioritizing lower games_played)
        if ($best === null) {
            $n = count($list);
            for ($i = 0; $i < $n - 3; $i++) {
                for ($j = $i + 1; $j < $n - 2; $j++) {
                    for ($k = $j + 1; $k < $n - 1; $k++) {
                        for ($l = $k + 1; $l < $n; $l++) {
                            $group = [$list[$i], $list[$j], $list[$k], $list[$l]];
                            if ($isBalancedDoubles($group)) {
                                $best = $group;
                                break 4; // break all loops
                            }
                        }
                    }
                }
            }
        }

        if ($best === null) {
            return response()->json(['suggested' => []]);
        }

        return response()->json([
            'suggested' => array_map(fn ($e) => [
                'queue_entry_id' => $e->id,
                'level' => (float) $e->level,
                'name' => $e->user_id ? ($e->user?->name ?? '') : (string) $e->guest_name,
            ], $best),
        ]);
    }

    public function entries(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        return QueueEntry::where('queue_session_id', $session->id)
            ->with('user:id,name')
            ->orderBy('joined_at')
            ->get();
    }

    public function storeEntry(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        $hasUser = $request->filled('user_id');
        $hasGuest = $request->filled('guest_name') && $request->filled('level');

        if ($hasUser === $hasGuest) {
            return response()->json([
                'message' => 'Provide either user_id or both guest_name and level.',
            ], 422);
        }

        if ($hasUser) {
            $request->validate(['user_id' => 'required|exists:users,id']);
            $user = \App\Models\User::find($request->user_id);
            $level = $request->input('level') ?? $user->level ?? 3.0;
        } else {
            $request->validate([
                'guest_name' => 'required|string|max:255',
                'level' => 'required|numeric|min:1|max:7',
            ]);
            $level = (float) $request->level;
        }

        $data = [
            'queue_session_id' => $session->id,
            'level' => $level,
            'status' => 'waiting',
            'phone' => $request->input('phone'),
            'notes' => $request->input('notes'),
        ];

        if ($hasUser) {
            $data['user_id'] = $request->user_id;
        } else {
            $data['guest_name'] = $request->guest_name;
        }

        $entry = QueueEntry::create($data);
        $entry->load('user:id,name');

        return $entry;
    }

    public function searchUsers(Request $request)
    {
        $q = $request->input('q', '');
        if (strlen($q) < 2) {
            return [];
        }

        return \App\Models\User::where(function ($query) use ($q) {
            $query->where('name', 'like', '%' . $q . '%')
                ->orWhere('email', 'like', '%' . $q . '%');
        })
            ->limit(10)
            ->get(['id', 'name', 'email', 'level']);
    }

    public function owners(Request $request)
    {
        return \App\Models\User::where('role', 'owner')->get(['id', 'name']);
    }

    private function authorizeSession(Request $request, QueueSession $session): void
    {
        $user = $request->user();
        $allowed = $session->owner_id === $user->id || $user->role === 'queue_master';
        abort_if(! $allowed, 403);
    }
}
