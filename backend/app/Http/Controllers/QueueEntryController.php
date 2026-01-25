<?php

namespace App\Http\Controllers;

use App\Models\QueueEntry;
use Illuminate\Http\Request;

class QueueEntryController extends Controller
{
    public function update(Request $request, QueueEntry $entry)
    {
        $session = $entry->queueSession;
        $user = $request->user();
        $allowed = $session->owner_id === $user->id || $user->role === 'queue_master';
        abort_if(! $allowed, 403);

        $request->validate([
            'status' => 'sometimes|in:waiting,matched,playing,done,left',
            'level' => 'sometimes|numeric|min:1|max:7',
            'phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
        ]);

        $entry->update($request->only(['status', 'level', 'phone', 'notes']));

        return $entry->load('user:id,name');
    }

    public function destroy(Request $request, QueueEntry $entry)
    {
        $session = $entry->queueSession;
        $user = $request->user();
        $allowed = $session->owner_id === $user->id || $user->role === 'queue_master';
        abort_if(! $allowed, 403);

        $entry->delete();

        return response()->json(null, 204);
    }
}
