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
     * List all bookings for the authenticated user
     */
    public function userBookings(Request $request)
    {
        $query = CourtBooking::where('user_id', Auth::id())
            ->with('court:id,name')
            ->orderBy('date', 'desc')
            ->orderBy('start_time', 'desc');

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter upcoming vs past bookings
        if ($request->has('upcoming') && $request->upcoming === 'true') {
            $today = Carbon::today()->toDateString();
            $query->where('date', '>=', $today)
                  ->where('status', 'confirmed');
        }

        return $query->get();
    }

    /**
     * List all bookings for owner's courts
     */
    public function ownerBookings(Request $request)
    {
        $ownerId = Auth::id();
        
        // Get all court IDs owned by this user
        $courtIds = Court::where('owner_id', $ownerId)->pluck('id');
        
        $query = CourtBooking::whereIn('court_id', $courtIds)
            ->with(['court:id,name', 'user:id,name,email'])
            ->orderBy('date', 'desc')
            ->orderBy('start_time', 'desc');

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date if provided
        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        // Filter upcoming vs past bookings
        if ($request->has('upcoming') && $request->upcoming === 'true') {
            $today = Carbon::today()->toDateString();
            $query->where('date', '>=', $today)
                  ->where('status', 'confirmed');
        }

        return $query->get();
    }

    /**
     * Get owner statistics
     */
    public function ownerStats(Request $request)
    {
        $ownerId = Auth::id();
        
        // Get all court IDs owned by this user
        $courtIds = Court::where('owner_id', $ownerId)->pluck('id');
        
        $today = Carbon::today()->toDateString();
        $thisMonthStart = Carbon::now()->startOfMonth()->toDateString();
        $thisWeekStart = Carbon::now()->startOfWeek()->toDateString();
        
        $totalCourts = $courtIds->count();
        $activeCourts = Court::where('owner_id', $ownerId)
            ->where('is_active', true)
            ->count();
        
        $totalBookings = CourtBooking::whereIn('court_id', $courtIds)
            ->where('status', 'confirmed')
            ->count();
        
        $todayBookings = CourtBooking::whereIn('court_id', $courtIds)
            ->where('date', $today)
            ->where('status', 'confirmed')
            ->count();
        
        $thisWeekBookings = CourtBooking::whereIn('court_id', $courtIds)
            ->where('date', '>=', $thisWeekStart)
            ->where('status', 'confirmed')
            ->count();
        
        $thisMonthBookings = CourtBooking::whereIn('court_id', $courtIds)
            ->where('date', '>=', $thisMonthStart)
            ->where('status', 'confirmed')
            ->count();
        
        $upcomingBookings = CourtBooking::whereIn('court_id', $courtIds)
            ->where('date', '>=', $today)
            ->where('status', 'confirmed')
            ->count();
        
        return response()->json([
            'total_courts' => $totalCourts,
            'active_courts' => $activeCourts,
            'total_bookings' => $totalBookings,
            'today_bookings' => $todayBookings,
            'this_week_bookings' => $thisWeekBookings,
            'this_month_bookings' => $thisMonthBookings,
            'upcoming_bookings' => $upcomingBookings,
        ]);
    }

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
                $q->where('start_time', '<=', $request->start_time)
                    ->where('end_time', '>=', $request->end_time);
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
