<?php

namespace App\Http\Controllers;

use App\Models\QueueEntry;
use App\Services\QueueEntryService;
use Illuminate\Http\Request;

class QueueEntryController extends Controller
{
    public function __construct(
        private QueueEntryService $queueEntryService
    ) {
    }

    public function update(Request $request, QueueEntry $entry)
    {
        $session = $entry->queueSession;
        $this->authorize('update', $session);

        $request->validate([
            'status' => 'sometimes|in:waiting,matched,playing,done,left',
            'level' => 'sometimes|numeric|min:1|max:7',
            'phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
        ]);

        return $this->queueEntryService->updateEntry(
            $entry,
            $request->only(['status', 'level', 'phone', 'notes'])
        );
    }

    public function destroy(Request $request, QueueEntry $entry)
    {
        $session = $entry->queueSession;
        $this->authorize('update', $session);

        $entry->delete();

        return response()->json(null, 204);
    }
}
