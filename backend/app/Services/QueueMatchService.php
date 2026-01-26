<?php

namespace App\Services;

use App\Exceptions\CourtNotAvailableException;
use App\Exceptions\InvalidTeamAssignmentException;
use App\Exceptions\MatchNotActiveException;
use App\Models\Court;
use App\Models\QueueEntry;
use App\Models\QueueMatch;
use App\Models\QueueSession;
use Illuminate\Support\Facades\DB;

class QueueMatchService
{
    /**
     * Create a match with team assignment.
     */
    public function createMatch(array $data, QueueSession $session): QueueMatch
    {
        $courtId = (int) $data['court_id'];

        // Validate court availability
        if (!$this->isCourtAvailable($courtId, $session)) {
            throw new CourtNotAvailableException('Court is not available for this session.');
        }

        // Handle team-based assignment (new format)
        if (isset($data['teamA']) && isset($data['teamB'])) {
            return $this->createMatchWithTeams($data, $session, $courtId);
        }

        // Handle legacy queue_entry_ids format
        if (isset($data['queue_entry_ids'])) {
            return $this->createMatchWithEntryIds($data, $session, $courtId);
        }

        throw new InvalidTeamAssignmentException('Either teamA/teamB or queue_entry_ids must be provided.');
    }

    /**
     * Complete a match.
     */
    public function completeMatch(QueueMatch $match, ?int $shuttlecocksUsed = null): QueueMatch
    {
        if ($match->status !== 'active') {
            throw new MatchNotActiveException('Match is not active.');
        }

        return DB::transaction(function () use ($match, $shuttlecocksUsed) {
            $entryIds = $match->queueMatchPlayers()->pluck('queue_entry_id')->all();

            // Increment games played and reset status to waiting
            QueueEntry::whereIn('id', $entryIds)->increment('games_played');
            QueueEntry::whereIn('id', $entryIds)->update(['status' => 'waiting']);

            // Update match status
            $match->update([
                'status' => 'completed',
                'end_time' => now(),
                'shuttlecocks_used' => $shuttlecocksUsed,
            ]);

            return $match;
        });
    }

    /**
     * Check if a court is available for a session.
     */
    private function isCourtAvailable(int $courtId, QueueSession $session): bool
    {
        $availableCourtIds = Court::where('owner_id', $session->owner_id)
            ->where(fn ($q) => $q->whereNull('is_active')->orWhere('is_active', true))
            ->whereDoesntHave('queueMatches', function ($q) use ($session) {
                $q->where('queue_session_id', $session->id)->where('status', 'active');
            })
            ->pluck('id')
            ->all();

        return in_array($courtId, $availableCourtIds, true);
    }

    /**
     * Create match with team-based assignment (new format).
     */
    private function createMatchWithTeams(array $data, QueueSession $session, int $courtId): QueueMatch
    {
        $teamAIds = array_values(array_unique($data['teamA']));
        $teamBIds = array_values(array_unique($data['teamB']));

        if (count($teamAIds) !== 2 || count($teamBIds) !== 2) {
            throw new InvalidTeamAssignmentException('Both Team A and Team B must have exactly 2 players.');
        }

        $allEntryIds = array_merge($teamAIds, $teamBIds);
        if (count(array_unique($allEntryIds)) !== 4) {
            throw new InvalidTeamAssignmentException('All 4 players must be unique.');
        }

        $entries = QueueEntry::whereIn('id', $allEntryIds)
            ->where('queue_session_id', $session->id)
            ->where('status', 'waiting')
            ->get();

        if ($entries->count() !== 4) {
            throw new InvalidTeamAssignmentException('All 4 entries must be waiting and belong to this session.');
        }

        return DB::transaction(function () use ($session, $courtId, $teamAIds, $teamBIds, $entries) {
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

            return $match;
        });
    }

    /**
     * Create match with entry IDs (legacy format).
     */
    private function createMatchWithEntryIds(array $data, QueueSession $session, int $courtId): QueueMatch
    {
        $entryIds = array_values(array_unique($data['queue_entry_ids']));
        if (count($entryIds) !== 4) {
            throw new InvalidTeamAssignmentException('Exactly 4 unique queue_entry_ids are required.');
        }

        $entries = QueueEntry::whereIn('id', $entryIds)
            ->where('queue_session_id', $session->id)
            ->where('status', 'waiting')
            ->get();

        if ($entries->count() !== 4) {
            throw new InvalidTeamAssignmentException('All 4 entries must be waiting and belong to this session.');
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
            throw new InvalidTeamAssignmentException('Could not order entries correctly.');
        }

        return DB::transaction(function () use ($session, $courtId, $orderedEntries) {
            $match = QueueMatch::create([
                'queue_session_id' => $session->id,
                'court_id' => $courtId,
                'status' => 'active',
                'start_time' => now(),
            ]);

            // Assign teams: first 2 players = Team A, last 2 = Team B
            foreach ($orderedEntries as $index => $entry) {
                $team = $index < 2 ? 'A' : 'B';
                $match->queueMatchPlayers()->create([
                    'queue_entry_id' => $entry->id,
                    'team' => $team,
                ]);
                $entry->update(['status' => 'playing']);
            }

            return $match;
        });
    }
}
