<?php

namespace App\Services;

use App\Models\Court;
use App\Models\QueueMatch;
use App\Models\QueueSession;
use App\Models\User;
use Illuminate\Support\Collection;

class QueueSessionService
{
    /**
     * Create a queue session.
     */
    public function createSession(array $data, User $user): QueueSession
    {
        $ownerId = $user->role === 'owner' ? $user->id : $data['owner_id'] ?? null;

        if ($user->role === 'queue_master' && !$ownerId) {
            throw new \InvalidArgumentException('owner_id is required for queue_master');
        }

        return QueueSession::create([
            'owner_id' => $ownerId,
            'date' => $data['date'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'] ?? null,
            'status' => 'upcoming',
        ]);
    }

    /**
     * Get session with all relations loaded.
     */
    public function getSessionWithRelations(QueueSession $session): QueueSession
    {
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

    /**
     * Get available courts for a session.
     */
    public function getAvailableCourts(QueueSession $session): Collection
    {
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
    public function getAllCourtsWithStatus(QueueSession $session): Collection
    {
        $courts = Court::where('owner_id', $session->owner_id)
            ->where(fn ($q) => $q->whereNull('is_active')->orWhere('is_active', true))
            ->get(['id', 'name']);

        // Get active matches for this session with players
        $activeMatches = QueueMatch::where('queue_session_id', $session->id)
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
                $entry = $qmp->queueEntry;
                $name = $entry ? ($entry->user?->name ?? $entry->guest_name ?? '') : '';
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
}
