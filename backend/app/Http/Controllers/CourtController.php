<?php

namespace App\Http\Controllers;

use App\Models\Court;
use App\Services\CourtService;
use Illuminate\Http\Request;

class CourtController extends Controller
{
    public function __construct(
        private CourtService $courtService
    ) {
    }

    public function index(Request $request)
    {
        return Court::where('owner_id', $request->user()->id)->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:50'
        ]);

        return Court::create([
            'owner_id' => $request->user()->id,
            'name' => $request->name
        ]);
    }

    public function update(Request $request, Court $court)
    {
        // ownership check
        abort_if($court->owner_id !== $request->user()->id, 403);

        $court->update($request->only(['name', 'is_active']));
        return $court;
    }

    /**
     * Get available courts with time slots for players
     */
    public function availableForPlayers(Request $request)
    {
        $request->validate([
            'date' => 'required|date'
        ]);

        // Get all active courts (or all courts if is_active is not set)
        $courts = Court::where(function ($query) {
            $query->whereNull('is_active')
                  ->orWhere('is_active', true);
        })->get();

        $result = [];

        foreach ($courts as $court) {
            $slots = $this->courtService->getAvailableTimeSlots($court, $request->date);

            // Only include court if it has slots
            if (count($slots) > 0) {
                $result[] = [
                    'id' => $court->id,
                    'name' => $court->name,
                    'slots' => $slots,
                ];
            }
        }

        return response()->json($result);
    }
}
