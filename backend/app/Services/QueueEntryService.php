<?php

namespace App\Services;

use App\Models\QueueEntry;
use App\Models\QueueSession;
use App\Models\User;

class QueueEntryService
{
    /**
     * Create a queue entry (user or guest).
     */
    public function createEntry(array $data, QueueSession $session): QueueEntry
    {
        $hasUser = isset($data['user_id']);
        $hasGuest = isset($data['guest_name']) && isset($data['level']);

        if ($hasUser === $hasGuest) {
            throw new \InvalidArgumentException('Provide either user_id or both guest_name and level.');
        }

        if ($hasUser) {
            $user = User::findOrFail($data['user_id']);
            $level = $data['level'] ?? $user->level ?? 3.0;
        } else {
            $level = (float) $data['level'];
        }

        $entryData = [
            'queue_session_id' => $session->id,
            'level' => $level,
            'status' => 'waiting',
            'phone' => $data['phone'] ?? null,
            'notes' => $data['notes'] ?? null,
        ];

        if ($hasUser) {
            $entryData['user_id'] = $data['user_id'];
        } else {
            $entryData['guest_name'] = $data['guest_name'];
        }

        $entry = QueueEntry::create($entryData);
        $entry->load('user:id,name');

        return $entry;
    }

    /**
     * Update a queue entry.
     */
    public function updateEntry(QueueEntry $entry, array $data): QueueEntry
    {
        $entry->update($data);
        $entry->load('user:id,name');

        return $entry;
    }
}
