<?php

namespace App\Http\Controllers;

use App\Models\Court;
use App\Models\QueueEntry;
use App\Models\QueueSession;
use Illuminate\Http\Request;

class QueueSessionController extends Controller
{
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
        $user = $request->user();
        $ownerId = $user->role === 'owner' ? $user->id : $request->input('owner_id');

        if ($user->role === 'queue_master' && ! $ownerId) {
            return response()->json(['message' => 'owner_id is required for queue_master'], 422);
        }

        $request->validate([
            'date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
        ]);

        $data = [
            'owner_id' => $ownerId,
            'date' => $request->date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'status' => 'upcoming',
        ];

        return QueueSession::create($data);
    }

    public function show(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        $session->load([
            'owner:id,name',
            'entries' => fn ($q) => $q->with('user:id,name')->orderBy('joined_at'),
            'matches' => fn ($q) => $q->where('status', 'active')->with('court:id,name'),
        ]);

        return $session;
    }

    public function update(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        $request->validate([
            'status' => 'sometimes|in:upcoming,active,ended',
            'end_time' => 'nullable|date_format:H:i',
        ]);

        $session->update($request->only(['status', 'end_time']));

        return $session;
    }

    public function availableCourts(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        return Court::where('owner_id', $session->owner_id)
            ->where(fn ($q) => $q->whereNull('is_active')->orWhere('is_active', true))
            ->whereDoesntHave('queueMatches', function ($q) use ($session) {
                $q->where('queue_session_id', $session->id)->where('status', 'active');
            })
            ->get(['id', 'name']);
    }

    public function entries(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        return QueueEntry::where('queue_session_id', $session->id)
            ->with('user:id,name')
            ->orderBy('joined_at')
            ->get();
    }

    public function storeEntry(Request $request, QueueSession $session)
    {
        $this->authorizeSession($request, $session);

        $hasUser = $request->filled('user_id');
        $hasGuest = $request->filled('guest_name') && $request->filled('level');

        if ($hasUser === $hasGuest) {
            return response()->json([
                'message' => 'Provide either user_id or both guest_name and level.',
            ], 422);
        }

        if ($hasUser) {
            $request->validate(['user_id' => 'required|exists:users,id']);
            $user = \App\Models\User::find($request->user_id);
            $level = $request->input('level') ?? $user->level ?? 3.0;
        } else {
            $request->validate([
                'guest_name' => 'required|string|max:255',
                'level' => 'required|numeric|min:1|max:7',
            ]);
            $level = (float) $request->level;
        }

        $data = [
            'queue_session_id' => $session->id,
            'level' => $level,
            'status' => 'waiting',
            'phone' => $request->input('phone'),
            'notes' => $request->input('notes'),
        ];

        if ($hasUser) {
            $data['user_id'] = $request->user_id;
        } else {
            $data['guest_name'] = $request->guest_name;
        }

        $entry = QueueEntry::create($data);
        $entry->load('user:id,name');

        return $entry;
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

    private function authorizeSession(Request $request, QueueSession $session): void
    {
        $user = $request->user();
        $allowed = $session->owner_id === $user->id || $user->role === 'queue_master';
        abort_if(! $allowed, 403);
    }
}
