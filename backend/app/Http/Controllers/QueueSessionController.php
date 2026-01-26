<?php

namespace App\Http\Controllers;

use App\Exceptions\CourtNotAvailableException;
use App\Models\QueueEntry;
use App\Models\QueueSession;
use App\Services\MatchSuggestionService;
use App\Services\QueueEntryService;
use App\Services\QueueSessionService;
use Illuminate\Http\Request;

class QueueSessionController extends Controller
{
    public function __construct(
        private QueueSessionService $queueSessionService,
        private QueueEntryService $queueEntryService,
        private MatchSuggestionService $matchSuggestionService
    ) {
    }
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
        $request->validate([
            'date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
        ]);

        try {
            return $this->queueSessionService->createSession(
                $request->only(['date', 'start_time', 'end_time', 'owner_id']),
                $request->user()
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function show(Request $request, QueueSession $session)
    {
        $this->authorize('view', $session);

        return $this->queueSessionService->getSessionWithRelations($session);
    }

    public function update(Request $request, QueueSession $session)
    {
        $this->authorize('update', $session);

        $request->validate([
            'status' => 'sometimes|in:upcoming,active,ended',
            'end_time' => 'nullable|date_format:H:i',
        ]);

        $session->update($request->only(['status', 'end_time']));

        return $session;
    }

    public function availableCourts(Request $request, QueueSession $session)
    {
        $this->authorize('view', $session);

        return $this->queueSessionService->getAvailableCourts($session);
    }

    /**
     * Get all courts with their status (available or in-use) for visual display.
     */
    public function allCourts(Request $request, QueueSession $session)
    {
        $this->authorize('view', $session);

        return $this->queueSessionService->getAllCourtsWithStatus($session);
    }

    /**
     * Suggest 4 players for a match (level-based, max spread 1.0). Doubles only.
     * Body: { "court_id": int }. Returns { "suggested": [ { "queue_entry_id", "level", "name" } ] }.
     */
    public function suggestMatch(Request $request, QueueSession $session)
    {
        $this->authorize('view', $session);

        $request->validate(['court_id' => 'required|exists:courts,id']);

        try {
            return response()->json(
                $this->matchSuggestionService->suggestMatch($session, (int) $request->court_id)
            );
        } catch (CourtNotAvailableException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function entries(Request $request, QueueSession $session)
    {
        $this->authorize('view', $session);

        return QueueEntry::where('queue_session_id', $session->id)
            ->with('user:id,name')
            ->orderBy('joined_at')
            ->get();
    }

    public function storeEntry(Request $request, QueueSession $session)
    {
        $this->authorize('update', $session);

        $hasUser = $request->filled('user_id');
        $hasGuest = $request->filled('guest_name') && $request->filled('level');

        if ($hasUser === $hasGuest) {
            return response()->json([
                'message' => 'Provide either user_id or both guest_name and level.',
            ], 422);
        }

        if ($hasUser) {
            $request->validate(['user_id' => 'required|exists:users,id']);
        } else {
            $request->validate([
                'guest_name' => 'required|string|max:255',
                'level' => 'required|numeric|min:1|max:7',
            ]);
        }

        try {
            return $this->queueEntryService->createEntry(
                $request->only(['user_id', 'guest_name', 'level', 'phone', 'notes']),
                $session
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
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

}
