<?php

namespace App\Http\Controllers;

use App\Models\Court;
use App\Models\QueueEntry;
use App\Models\QueueMatch;
use App\Models\QueueSession;
use Illuminate\Http\Request;

class QueueMatchController extends Controller
{
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
        $this->authorizeSession($request, $session);

        $courtId = (int) $request->court_id;

        // Check court availability
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

        // Handle new team-based assignment
        if ($request->has('teamA') && $request->has('teamB')) {
            $teamAIds = array_values(array_unique($request->teamA));
            $teamBIds = array_values(array_unique($request->teamB));
            
            if (count($teamAIds) !== 2 || count($teamBIds) !== 2) {
                return response()->json(['message' => 'Both Team A and Team B must have exactly 2 players.'], 422);
            }

            $allEntryIds = array_merge($teamAIds, $teamBIds);
            if (count(array_unique($allEntryIds)) !== 4) {
                return response()->json(['message' => 'All 4 players must be unique.'], 422);
            }

            $entries = QueueEntry::whereIn('id', $allEntryIds)
                ->where('queue_session_id', $session->id)
                ->where('status', 'waiting')
                ->get();
            
            if ($entries->count() !== 4) {
                return response()->json(['message' => 'All 4 entries must be waiting and belong to this session.'], 422);
            }

            $match = QueueMatch::create([
                'queue_session_id' => $session->id,
                'court_id' => $courtId,
                'status' => 'active',
                'start_time' => now(),
            ]);

            // Assign Team A
            foreach ($teamAIds as $entryId) {
                $entry = $entries->firstWhere('id', $entryId);
                if ($entry) {
                    $match->queueMatchPlayers()->create([
                        'queue_entry_id' => $entry->id,
                        'team' => 'A',
                    ]);
                    $entry->update(['status' => 'playing']);
                }
            }

            // Assign Team B
            foreach ($teamBIds as $entryId) {
                $entry = $entries->firstWhere('id', $entryId);
                if ($entry) {
                    $match->queueMatchPlayers()->create([
                        'queue_entry_id' => $entry->id,
                        'team' => 'B',
                    ]);
                    $entry->update(['status' => 'playing']);
                }
            }
        } else {
            // Legacy: handle queue_entry_ids (backward compatibility)
            $entryIds = array_values(array_unique($request->queue_entry_ids));
            if (count($entryIds) !== 4) {
                return response()->json(['message' => 'Exactly 4 unique queue_entry_ids are required.'], 422);
            }

            $entries = QueueEntry::whereIn('id', $entryIds)
                ->where('queue_session_id', $session->id)
                ->where('status', 'waiting')
                ->get();
            if ($entries->count() !== 4) {
                return response()->json(['message' => 'All 4 entries must be waiting and belong to this session.'], 422);
            }

            // Ensure entries are in the same order as entryIds
            $orderedEntries = [];
            foreach ($entryIds as $id) {
                $entry = $entries->firstWhere('id', $id);
                if ($entry) {
                    $orderedEntries[] = $entry;
                }
            }
            if (count($orderedEntries) !== 4) {
                return response()->json(['message' => 'Could not order entries correctly.'], 422);
            }

            $match = QueueMatch::create([
                'queue_session_id' => $session->id,
                'court_id' => $courtId,
                'status' => 'active',
                'start_time' => now(),
            ]);

            // Assign teams: first 2 players = Team A, last 2 = Team B
            foreach ($orderedEntries as $index => $e) {
                $team = $index < 2 ? 'A' : 'B';
                $match->queueMatchPlayers()->create([
                    'queue_entry_id' => $e->id,
                    'team' => $team,
                ]);
                $e->update(['status' => 'playing']);
            }
        }

        $match->load([
            'court:id,name',
            'queueMatchPlayers' => fn ($q) => $q->with(['queueEntry' => fn ($eq) => $eq->with('user:id,name')]),
        ]);

        return $match;
    }

    public function update(Request $request, QueueMatch $match)
    {
        $session = $match->queueSession;
        $this->authorizeSession($request, $session);

        $request->validate([
            'status' => 'required|in:completed',
            'shuttlecocks_used' => 'nullable|integer|min:0',
        ]);

        if ($match->status !== 'active') {
            return response()->json(['message' => 'Match is not active.'], 422);
        }

        $entryIds = $match->queueMatchPlayers()->pluck('queue_entry_id')->all();
        QueueEntry::whereIn('id', $entryIds)->increment('games_played');
        QueueEntry::whereIn('id', $entryIds)->update(['status' => 'waiting']);

        $match->update([
            'status' => 'completed',
            'end_time' => now(),
            'shuttlecocks_used' => $request->input('shuttlecocks_used'),
        ]);

        return $match->load('court:id,name');
    }

    private function authorizeSession(Request $request, QueueSession $session): void
    {
        $user = $request->user();
        $allowed = $session->owner_id === $user->id || $user->role === 'queue_master';
        abort_if(! $allowed, 403);
    }
}
