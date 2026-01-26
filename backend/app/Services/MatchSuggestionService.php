<?php

namespace App\Services;

use App\Exceptions\CourtNotAvailableException;
use App\Models\Court;
use App\Models\QueueEntry;
use App\Models\QueueSession;

class MatchSuggestionService
{
    /**
     * Suggest 4 players for a match (level-based, max spread 1.0). Doubles only.
     */
    public function suggestMatch(QueueSession $session, int $courtId): array
    {
        // Validate court availability
        $availableCourtIds = $this->getAvailableCourtIds($session);
        if (!in_array($courtId, $availableCourtIds, true)) {
            throw new CourtNotAvailableException('Court is not available for this session.');
        }

        // Sort by: lowest games_played first, then FIFO (joined_at)
        $waiting = QueueEntry::where('queue_session_id', $session->id)
            ->where('status', 'waiting')
            ->with('user:id,name')
            ->orderBy('games_played', 'asc')
            ->orderBy('joined_at', 'asc')
            ->get();

        if ($waiting->count() < 4) {
            return ['suggested' => []];
        }

        $list = $waiting->values()->all();

        // Try all combinations of 4 players (prioritize earlier in queue)
        // For performance, check consecutive groups first, then try all combinations
        $best = null;

        // First: try consecutive groups (FIFO with games_played priority)
        for ($i = 0; $i <= count($list) - 4; $i++) {
            $group = array_slice($list, $i, 4);
            if ($this->isBalancedDoubles($group)) {
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
                            if ($this->isBalancedDoubles($group)) {
                                $best = $group;
                                break 4; // break all loops
                            }
                        }
                    }
                }
            }
        }

        if ($best === null) {
            return ['suggested' => []];
        }

        return [
            'suggested' => array_map(fn ($e) => [
                'queue_entry_id' => $e->id,
                'level' => (float) $e->level,
                'name' => $e->user_id ? ($e->user?->name ?? '') : (string) $e->guest_name,
            ], $best),
        ];
    }

    /**
     * Get available court IDs for a session.
     */
    private function getAvailableCourtIds(QueueSession $session): array
    {
        return Court::where('owner_id', $session->owner_id)
            ->where(fn ($q) => $q->whereNull('is_active')->orWhere('is_active', true))
            ->whereDoesntHave('queueMatches', function ($q) use ($session) {
                $q->where('queue_session_id', $session->id)->where('status', 'active');
            })
            ->pluck('id')
            ->all();
    }

    /**
     * Get bracket from numeric level.
     */
    private function getBracket(float $level): string
    {
        if ($level <= 2.5) {
            return 'beginner';
        }
        if ($level <= 4.5) {
            return 'intermediate';
        }
        return 'advanced';
    }

    /**
     * Check if 4 players can form balanced doubles teams.
     */
    private function isBalancedDoubles(array $players): bool
    {
        $brackets = array_map(fn ($p) => $this->getBracket((float) $p->level), $players);
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
    }
}
