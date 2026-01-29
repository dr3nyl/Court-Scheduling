<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCourtAvailabilityRequest;
use App\Http\Requests\UpdateCourtAvailabilityRequest;
use App\Http\Resources\CourtAvailabilityResource;
use App\Models\Court;
use App\Models\CourtAvailability;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class CourtAvailabilityController extends Controller
{
    use AuthorizesRequests;

    public function index(Court $court)
    {
        $this->authorize('manage-court', $court);

        $availabilities = $court->availabilities()->orderBy('day_of_week')->get();
        return CourtAvailabilityResource::collection($availabilities);
    }

    public function store(StoreCourtAvailabilityRequest $request, Court $court)
    {
        $this->authorize('manage-court', $court);

        $availability = CourtAvailability::create([
            'court_id' => $court->id,
            'day_of_week' => $request->day_of_week,
            'open_time' => $request->open_time,
            'close_time' => $request->close_time,
        ]);

        return new CourtAvailabilityResource($availability);
    }

    public function update(UpdateCourtAvailabilityRequest $request, Court $court, CourtAvailability $availability)
    {
        $this->authorize('manage-court', $court);

        if ($availability->court_id !== $court->id) {
            abort(403);
        }

        $availability->update($request->only(['open_time', 'close_time']));

        return new CourtAvailabilityResource($availability);
    }

    public function destroy(Court $court, CourtAvailability $availability)
    {
        $this->authorize('manage-court', $court);

        if ($availability->court_id !== $court->id) {
            abort(403);
        }

        $availability->delete();

        return response()->noContent();
    }
}
