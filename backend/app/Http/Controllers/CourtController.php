<?php

namespace App\Http\Controllers;

use App\Models\Court;
use App\Models\CourtAvailability;
use App\Models\CourtBooking;
use Carbon\Carbon;
use Illuminate\Http\Request;

class CourtController extends Controller
{
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

        $date = $request->date;
        $dayOfWeek = Carbon::parse($date)->dayOfWeek; // 0=Sunday, 1=Monday, ..., 6=Saturday

        // Get all active courts (or all courts if is_active is not set)
        $courts = Court::where(function ($query) {
            $query->whereNull('is_active')
                  ->orWhere('is_active', true);
        })->get();

        $result = [];

        foreach ($courts as $court) {
            // Find availability for this day of week
            $availability = CourtAvailability::where('court_id', $court->id)
                ->where('day_of_week', $dayOfWeek)
                ->first();

            // If no availability for this day, skip this court
            if (!$availability) {
                continue;
            }

            // Get existing bookings for this date
            $bookings = CourtBooking::where('court_id', $court->id)
                ->where('date', $date)
                ->where('status', 'confirmed')
                ->get();

            // Generate hourly time slots from open_time to close_time
            $slots = [];
            $openTime = Carbon::parse($availability->open_time);
            $closeTime = Carbon::parse($availability->close_time);

            $currentTime = $openTime->copy();

            while ($currentTime->lt($closeTime)) {
                $slotStart = $currentTime->format('H:i');
                $slotEnd = $currentTime->copy()->addHour()->format('H:i');

                // Check if this slot overlaps with any booking
                $isAvailable = true;
                foreach ($bookings as $booking) {
                    $bookingStart = Carbon::parse($booking->start_time);
                    $bookingEnd = Carbon::parse($booking->end_time);
                    $slotStartCarbon = Carbon::parse($slotStart);
                    $slotEndCarbon = Carbon::parse($slotEnd);

                    // Check for overlap
                    if ($slotStartCarbon->lt($bookingEnd) && $slotEndCarbon->gt($bookingStart)) {
                        $isAvailable = false;
                        break;
                    }
                }

                $slots[] = [
                    'start' => $slotStart,
                    'end' => $slotEnd,
                    'available' => $isAvailable,
                ];

                $currentTime->addHour();
            }

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
