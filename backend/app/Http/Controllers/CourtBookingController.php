<?php

namespace App\Http\Controllers;

use App\Models\Court;
use App\Models\CourtAvailability;
use App\Models\CourtBooking;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CourtBookingController extends Controller
{
    /**
     * List bookings of a court (optionally by date)
     */
    public function index(Request $request, Court $court)
    {
        $query = CourtBooking::where('court_id', $court->id)
            ->where('status', 'confirmed');

        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        return $query
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();
    }

    /**
     * Store a new booking
     */
    public function store(Request $request, Court $court)
    {
        $request->validate([
            'date' => 'required|date',
            'start_time' => 'required',
            'end_time' => 'required|after:start_time',
        ]);



        // 1️⃣ Check weekly availability
        $dayOfWeek = Carbon::parse($request->date)->dayOfWeek;


        $availabilityExists = CourtAvailability::where('court_id', $court->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('open_time', '<=', $request->start_time)
            ->where('close_time', '>=', $request->end_time)
            ->exists();

        if (! $availabilityExists) {
            return response()->json([
                'message' => 'Court is closed during this time.'
            ], 422);
        }

        // 2️⃣ Check overlapping bookings
        $hasOverlap = CourtBooking::where('court_id', $court->id)
            ->where('date', $request->date)
            ->where('status', 'confirmed')
            ->where(function ($q) use ($request) {
                $q->whereBetween('start_time', [$request->start_time, $request->end_time])
                  ->orWhereBetween('end_time', [$request->start_time, $request->end_time])
                  ->orWhere(function ($q) use ($request) {
                      $q->where('start_time', '<=', $request->start_time)
                        ->where('end_time', '>=', $request->end_time);
                  });
            })
            ->exists();

        if ($hasOverlap) {
            return response()->json([
                'message' => 'Time slot already booked.'
            ], 422);
        }

        // 3️⃣ Create booking
        $booking = CourtBooking::create([
            'court_id' => $court->id,
            'user_id' => Auth::id(),
            'date' => $request->date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'status' => 'confirmed',
        ]);

        return response()->json($booking, 201);
    }

    /**
     * Cancel a booking
     */
    public function destroy(CourtBooking $booking)
    {
        // Only owner or booking owner can cancel
        if (
            Auth::id() !== $booking->user_id &&
            Auth::id() !== $booking->court->owner_id
        ) {
            abort(403);
        }

        $booking->update([
            'status' => 'cancelled'
        ]);

        return response()->json([
            'message' => 'Booking cancelled'
        ]);
    }
}
