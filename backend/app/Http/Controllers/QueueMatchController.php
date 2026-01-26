<?php

namespace App\Http\Controllers;

use App\Exceptions\CourtNotAvailableException;
use App\Exceptions\InvalidTeamAssignmentException;
use App\Exceptions\MatchNotActiveException;
use App\Models\QueueMatch;
use App\Models\QueueSession;
use App\Services\QueueMatchService;
use Illuminate\Http\Request;

class QueueMatchController extends Controller
{
    public function __construct(
        private QueueMatchService $queueMatchService
    ) {
    }

    public function store(Request $request)
    {
        $request->validate([
            'queue_session_id' => 'required|exists:queue_sessions,id',
            'court_id' => 'required|exists:courts,id',
            // Accept either queue_entry_ids (legacy) or teamA/teamB (new)
            'queue_entry_ids' => 'sometimes|array|size:4',
            'queue_entry_ids.*' => 'integer|exists:queue_entries,id',
            'teamA' => 'sometimes|array|size:2',
            'teamA.*' => 'integer|exists:queue_entries,id',
            'teamB' => 'sometimes|array|size:2',
            'teamB.*' => 'integer|exists:queue_entries,id',
        ]);

        $session = QueueSession::findOrFail($request->queue_session_id);
        $this->authorize('update', $session);

        try {
            $match = $this->queueMatchService->createMatch(
                $request->only(['court_id', 'teamA', 'teamB', 'queue_entry_ids']),
                $session
            );

            $match->load([
                'court:id,name',
                'queueMatchPlayers' => fn ($q) => $q->with(['queueEntry' => fn ($eq) => $eq->with('user:id,name')]),
            ]);

            return $match;
        } catch (CourtNotAvailableException | InvalidTeamAssignmentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request, QueueMatch $match)
    {
        $session = $match->queueSession;
        $this->authorize('update', $session);

        $request->validate([
            'status' => 'required|in:completed',
            'shuttlecocks_used' => 'nullable|integer|min:0',
        ]);

        try {
            $match = $this->queueMatchService->completeMatch(
                $match,
                $request->input('shuttlecocks_used')
            );

            return $match->load('court:id,name');
        } catch (MatchNotActiveException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
