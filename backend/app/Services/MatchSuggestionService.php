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

        // Strategy: 
        // 1. First try to find 4 players with similar levels (all close together)
        // 2. If not possible, find mixed teams (1 high + 1 low per team)
        // 3. Collect all valid matches and randomly select one (shuffle mode)
        
        $validMatches = [
            'similar' => [], // Similar-level groups (priority)
            'mixed' => [],   // Mixed teams
        ];

        // First: try consecutive groups (FIFO with games_played priority)
        for ($i = 0; $i <= count($list) - 4; $i++) {
            $group = array_slice($list, $i, 4);
            $pairing = $this->findOptimalPairing($group);
            
            // Only accept if reasonably balanced (diff <= 1.0)
            if ($pairing['diff'] > 1.0) {
                continue;
            }
            
            $isSimilarLevel = $this->areSimilarLevels($group);
            
            if ($isSimilarLevel) {
                $validMatches['similar'][] = [
                    'ordered' => $pairing['ordered'],
                    'pairing' => $pairing,
                    'group' => $group,
                ];
            } else {
                $validMatches['mixed'][] = [
                    'ordered' => $pairing['ordered'],
                    'pairing' => $pairing,
                    'group' => $group,
                ];
            }
        }

        // If no good consecutive matches found, try all combinations
        if (empty($validMatches['similar']) && empty($validMatches['mixed'])) {
            $n = count($list);
            for ($i = 0; $i < $n - 3; $i++) {
                for ($j = $i + 1; $j < $n - 2; $j++) {
                    for ($k = $j + 1; $k < $n - 1; $k++) {
                        for ($l = $k + 1; $l < $n; $l++) {
                            $group = [$list[$i], $list[$j], $list[$k], $list[$l]];
                            $pairing = $this->findOptimalPairing($group);
                            
                            // Only accept if reasonably balanced (diff <= 1.0)
                            if ($pairing['diff'] > 1.0) {
                                continue;
                            }
                            
                            $isSimilarLevel = $this->areSimilarLevels($group);
                            
                            if ($isSimilarLevel) {
                                $validMatches['similar'][] = [
                                    'ordered' => $pairing['ordered'],
                                    'pairing' => $pairing,
                                    'group' => $group,
                                ];
                            } else {
                                $validMatches['mixed'][] = [
                                    'ordered' => $pairing['ordered'],
                                    'pairing' => $pairing,
                                    'group' => $group,
                                ];
                            }
                        }
                    }
                }
            }
        }

        // Select randomly from valid matches (prioritize similar-level groups and lowest games_played)
        $selected = null;
        
        // Helper function to calculate priority score (lower games_played = higher priority)
        $calculatePriority = function ($match) {
            $minGamesPlayed = min(array_map(fn ($p) => $p->games_played ?? 0, $match['group']));
            $avgGamesPlayed = array_sum(array_map(fn ($p) => $p->games_played ?? 0, $match['group'])) / 4;
            // Lower is better, so we use negative for sorting
            return ['min' => $minGamesPlayed, 'avg' => $avgGamesPlayed];
        };
        
        if (!empty($validMatches['similar'])) {
            // Sort by lowest games_played (min first, then avg)
            usort($validMatches['similar'], function ($a, $b) use ($calculatePriority) {
                $priorityA = $calculatePriority($a);
                $priorityB = $calculatePriority($b);
                if ($priorityA['min'] !== $priorityB['min']) {
                    return $priorityA['min'] <=> $priorityB['min'];
                }
                return $priorityA['avg'] <=> $priorityB['avg'];
            });
            
            // Get top matches with same lowest games_played, then randomly select from them
            $topMatches = [];
            $lowestGamesPlayed = $calculatePriority($validMatches['similar'][0])['min'];
            foreach ($validMatches['similar'] as $match) {
                $priority = $calculatePriority($match);
                if ($priority['min'] === $lowestGamesPlayed) {
                    $topMatches[] = $match;
                } else {
                    break;
                }
            }
            $selected = $topMatches[array_rand($topMatches)];
        } elseif (!empty($validMatches['mixed'])) {
            // Sort by lowest games_played (min first, then avg)
            usort($validMatches['mixed'], function ($a, $b) use ($calculatePriority) {
                $priorityA = $calculatePriority($a);
                $priorityB = $calculatePriority($b);
                if ($priorityA['min'] !== $priorityB['min']) {
                    return $priorityA['min'] <=> $priorityB['min'];
                }
                return $priorityA['avg'] <=> $priorityB['avg'];
            });
            
            // Get top matches with same lowest games_played, then randomly select from them
            $topMatches = [];
            $lowestGamesPlayed = $calculatePriority($validMatches['mixed'][0])['min'];
            foreach ($validMatches['mixed'] as $match) {
                $priority = $calculatePriority($match);
                if ($priority['min'] === $lowestGamesPlayed) {
                    $topMatches[] = $match;
                } else {
                    break;
                }
            }
            $selected = $topMatches[array_rand($topMatches)];
        }

        if ($selected === null) {
            return ['suggested' => []];
        }

        return [
            'suggested' => array_map(fn ($e) => [
                'queue_entry_id' => $e->id,
                'level' => (float) $e->level,
                'name' => $e->user_id ? ($e->user?->name ?? '') : (string) $e->guest_name,
            ], $selected['ordered']),
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
     * Check if 4 players have similar levels (max spread <= 1.5).
     */
    private function areSimilarLevels(array $players): bool
    {
        $levels = array_map(fn ($p) => (float) $p->level, $players);
        $minLevel = min($levels);
        $maxLevel = max($levels);
        return ($maxLevel - $minLevel) <= 1.5;
    }

    /**
     * Check if 4 players can form balanced doubles teams and return optimal pairing.
     * Returns array with 'balanced' (bool) and 'ordered' (array of players in optimal team order).
     * 
     * Strategy:
     * - If all players have similar levels: pair similar players together (2 highest vs 2 lowest)
     * - If mixed levels: pair 1 high + 1 low per team for balance
     */
    private function findOptimalPairing(array $players): array
    {
        $levels = array_map(fn ($p) => (float) $p->level, $players);
        $isSimilarLevel = $this->areSimilarLevels($players);

        // If all players have similar levels, pair similar players together
        if ($isSimilarLevel) {
            // Sort players by level
            $sorted = $players;
            usort($sorted, fn ($a, $b) => (float) $a->level <=> (float) $b->level);
            
            // Pair: 2 highest together vs 2 lowest together
            $teamA = [$sorted[2], $sorted[3]]; // 2 highest
            $teamB = [$sorted[0], $sorted[1]]; // 2 lowest
            
            $avgA = ((float) $sorted[2]->level + (float) $sorted[3]->level) / 2;
            $avgB = ((float) $sorted[0]->level + (float) $sorted[1]->level) / 2;
            $diff = abs($avgA - $avgB);
            
            return [
                'balanced' => $diff <= 0.5,
                'ordered' => array_merge($teamA, $teamB),
                'teamA' => $teamA,
                'teamB' => $teamB,
                'diff' => $diff,
            ];
        }

        // Mixed levels: pair 1 high + 1 low per team for balance
        // Try all possible pairings and find the best one
        $pairings = [
            // Pairing 1: Team A = [0,1], Team B = [2,3]
            [
                'teamA' => [$players[0], $players[1]],
                'teamB' => [$players[2], $players[3]],
                'avgA' => ($levels[0] + $levels[1]) / 2,
                'avgB' => ($levels[2] + $levels[3]) / 2,
            ],
            // Pairing 2: Team A = [0,2], Team B = [1,3] (mixed: high+low per team)
            [
                'teamA' => [$players[0], $players[2]],
                'teamB' => [$players[1], $players[3]],
                'avgA' => ($levels[0] + $levels[2]) / 2,
                'avgB' => ($levels[1] + $levels[3]) / 2,
            ],
            // Pairing 3: Team A = [0,3], Team B = [1,2] (mixed: high+low per team)
            [
                'teamA' => [$players[0], $players[3]],
                'teamB' => [$players[1], $players[2]],
                'avgA' => ($levels[0] + $levels[3]) / 2,
                'avgB' => ($levels[1] + $levels[2]) / 2,
            ],
        ];

        // Calculate difference for each pairing
        foreach ($pairings as &$pairing) {
            $pairing['diff'] = abs($pairing['avgA'] - $pairing['avgB']);
        }
        unset($pairing);

        // Find the pairing with the smallest difference
        $bestPairing = $pairings[0];
        foreach ($pairings as $pairing) {
            if ($pairing['diff'] < $bestPairing['diff']) {
                $bestPairing = $pairing;
            }
        }

        // Return players in optimal order: Team A first, then Team B
        return [
            'balanced' => $bestPairing['diff'] <= 0.5,
            'ordered' => array_merge($bestPairing['teamA'], $bestPairing['teamB']),
            'teamA' => $bestPairing['teamA'],
            'teamB' => $bestPairing['teamB'],
            'diff' => $bestPairing['diff'],
        ];
    }

    /**
     * Check if 4 players can form balanced doubles teams.
     */
    private function isBalancedDoubles(array $players): bool
    {
        $result = $this->findOptimalPairing($players);
        return $result['balanced'];
    }
}
