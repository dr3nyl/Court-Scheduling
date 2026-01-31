<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCourtRequest;
use App\Http\Requests\UpdateCourtRequest;
use App\Http\Resources\CourtResource;
use App\Http\Resources\CourtWithSlotsResource;
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
        $user = $request->user();
        $courts = $user->isSuperAdmin()
            ? Court::with('owner:id,name,email')->get()
            : Court::where('owner_id', $user->id)->get();
        return CourtResource::collection($courts);
    }

    public function store(StoreCourtRequest $request)
    {
        $user = $request->user();
        $ownerId = $user->id;

        if ($user->isSuperAdmin() && $request->filled('owner_id')) {
            $request->validate(['owner_id' => 'required|exists:users,id']);
            $ownerId = $request->owner_id;
        }

        $court = Court::create([
            'owner_id' => $ownerId,
            'name' => $request->name,
            'hourly_rate' => $request->hourly_rate,
            'reservation_fee_percentage' => $request->reservation_fee_percentage ?? 0,
        ]);

        return new CourtResource($court->load('owner:id,name,email'));
    }

    public function update(UpdateCourtRequest $request, Court $court)
    {
        if (! $request->user()->isSuperAdmin() && $court->owner_id !== $request->user()->id) {
            abort(403);
        }

        $court->update($request->only(['name', 'is_active', 'hourly_rate', 'reservation_fee_percentage']));
        return new CourtResource($court);
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
                $courtResource = new CourtWithSlotsResource($court);
                $courtArray = $courtResource->toArray($request);
                $courtArray['slots'] = $slots;
                $result[] = $courtArray;
            }
        }

        return response()->json($result);
    }
}
