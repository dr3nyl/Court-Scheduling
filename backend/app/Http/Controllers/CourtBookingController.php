<?php

namespace App\Http\Controllers;

use App\Exceptions\CourtClosedException;
use App\Exceptions\TimeSlotUnavailableException;
use App\Http\Requests\CreateBookingRequest;
use App\Http\Resources\CourtBookingResource;
use App\Models\Court;
use App\Models\CourtAvailability;
use App\Models\CourtBooking;
use App\Models\QueueMatch;
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

        $bookings = $query->get();
        return CourtBookingResource::collection($bookings);
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

        $bookings = $query->get();
        return CourtBookingResource::collection($bookings);
    }

    /**
     * Owner: update a booking (shuttlecock count, start session).
     */
    public function ownerUpdateBooking(Request $request, CourtBooking $booking)
    {
        $court = $booking->court;
        if (!$court || $court->owner_id !== Auth::id()) {
            abort(403, 'Unauthorized.');
        }

        $request->validate([
            'shuttlecock_count' => 'nullable|integer|min:0',
            'start_session' => 'nullable|boolean',
            'payment_status' => 'nullable|in:reserved,paid',
        ]);

        if ($request->has('shuttlecock_count')) {
            $booking->shuttlecock_count = $request->shuttlecock_count === '' || $request->shuttlecock_count === null
                ? null
                : (int) $request->shuttlecock_count;
        }

        if ($request->boolean('start_session')) {
            $booking->started_at = $booking->started_at ?? Carbon::now();
        }

        if ($request->has('payment_status')) {
            $booking->payment_status = $request->payment_status;
        }

        $booking->save();

        $booking->load(['court:id,name', 'user:id,name,email']);

        return new CourtBookingResource($booking);
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

        // Today's summary: revenue, games played, cancelled
        $todayRevenue = 0;
        $todayBookingsWithCourt = CourtBooking::whereIn('court_id', $courtIds)
            ->where('date', $today)
            ->where('status', 'confirmed')
            ->with('court:id,hourly_rate')
            ->get();
        foreach ($todayBookingsWithCourt as $b) {
            $start = Carbon::parse($b->date . ' ' . $b->start_time);
            $end = Carbon::parse($b->date . ' ' . $b->end_time);
            $todayRevenue += ($start->diffInMinutes($end) / 60) * ($b->court->hourly_rate ?? 0);
        }
        $todayQueueMatches = QueueMatch::whereIn('court_id', $courtIds)
            ->whereDate('start_time', $today)
            ->where('status', 'completed')
            ->count();
        $todayGamesPlayed = $todayBookings + $todayQueueMatches;
        $todayCancelled = CourtBooking::whereIn('court_id', $courtIds)
            ->where('date', $today)
            ->where('status', 'cancelled')
            ->count();
        
        return response()->json([
            'total_courts' => $totalCourts,
            'active_courts' => $activeCourts,
            'total_bookings' => $totalBookings,
            'today_bookings' => $todayBookings,
            'today_revenue' => round($todayRevenue, 2),
            'today_games_played' => $todayGamesPlayed,
            'today_cancelled' => $todayCancelled,
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

        $bookings = $query
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();

        return CourtBookingResource::collection($bookings);
    }

    /**
     * Store a new booking
     */
    public function store(CreateBookingRequest $request, Court $court)
    {
        // 1️⃣ Check weekly availability
        $dayOfWeek = Carbon::parse($request->date)->dayOfWeek;

        $availabilityExists = CourtAvailability::where('court_id', $court->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('open_time', '<=', $request->start_time)
            ->where('close_time', '>=', $request->end_time)
            ->exists();

        if (! $availabilityExists) {
            throw new CourtClosedException('Court is closed during this time.');
        }

        // 2️⃣ Check overlapping bookings
        $hasOverlap = CourtBooking::where('court_id', $court->id)
            ->where('date', $request->date)
            ->where('status', 'confirmed')
            ->where(function ($q) use ($request) {
                $q->where(function ($query) use ($request) {
                    // New booking starts during existing booking
                    $query->where('start_time', '<=', $request->start_time)
                          ->where('end_time', '>', $request->start_time);
                })->orWhere(function ($query) use ($request) {
                    // New booking ends during existing booking
                    $query->where('start_time', '<', $request->end_time)
                          ->where('end_time', '>=', $request->end_time);
                })->orWhere(function ($query) use ($request) {
                    // New booking completely contains existing booking
                    $query->where('start_time', '>=', $request->start_time)
                          ->where('end_time', '<=', $request->end_time);
                });
            })
            ->exists();

        if ($hasOverlap) {
            throw new TimeSlotUnavailableException('Time slot is already booked.');
        }

        // 3️⃣ Create booking
        $booking = CourtBooking::create([
            'court_id' => $court->id,
            'user_id' => Auth::id(),
            'date' => $request->date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'status' => 'confirmed',
            'payment_status' => $request->payment_status ?? 'reserved',
        ]);

        return new CourtBookingResource($booking->load('court', 'user'));
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
            'message' => 'Booking cancelled successfully'
        ]);
    }

    /**
     * Get daily analytics (revenue, games played, cancelled)
     */
    public function dailyAnalytics(Request $request)
    {
        $ownerId = Auth::id();
        
        // Get all court IDs owned by this user
        $courtIds = Court::where('owner_id', $ownerId)->pluck('id');
        
        if ($courtIds->isEmpty()) {
            return response()->json([
                'data' => []
            ]);
        }

        // Date range filter (default: last 30 days)
        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->toDateString());

        // Get confirmed bookings with court info for revenue calculation
        $bookings = CourtBooking::whereIn('court_id', $courtIds)
            ->where('date', '>=', $startDate)
            ->where('date', '<=', $endDate)
            ->with('court:id,hourly_rate')
            ->get();

        // Get queue matches for owner's courts
        $queueMatches = QueueMatch::whereIn('court_id', $courtIds)
            ->whereDate('start_time', '>=', $startDate)
            ->whereDate('start_time', '<=', $endDate)
            ->get();

        // Group by date
        $dailyStats = [];

        // Process bookings
        foreach ($bookings as $booking) {
            $date = $booking->date;
            
            if (!isset($dailyStats[$date])) {
                $dailyStats[$date] = [
                    'date' => $date,
                    'revenue' => 0,
                    'games_played' => 0,
                    'cancelled' => 0,
                ];
            }

            if ($booking->status === 'confirmed') {
                // Calculate revenue: duration in hours × hourly_rate
                $start = Carbon::parse($booking->date . ' ' . $booking->start_time);
                $end = Carbon::parse($booking->date . ' ' . $booking->end_time);
                $hours = $start->diffInMinutes($end) / 60;
                $revenue = $hours * ($booking->court->hourly_rate ?? 0);
                
                $dailyStats[$date]['revenue'] += $revenue;
                $dailyStats[$date]['games_played'] += 1;
            } elseif ($booking->status === 'cancelled') {
                $dailyStats[$date]['cancelled'] += 1;
            }
        }

        // Process queue matches (completed = games played)
        foreach ($queueMatches as $match) {
            $date = Carbon::parse($match->start_time)->toDateString();
            
            if (!isset($dailyStats[$date])) {
                $dailyStats[$date] = [
                    'date' => $date,
                    'revenue' => 0,
                    'games_played' => 0,
                    'cancelled' => 0,
                ];
            }

            if ($match->status === 'completed') {
                $dailyStats[$date]['games_played'] += 1;
            }
        }

        // Convert to array and sort by date (newest first)
        $result = array_values($dailyStats);
        usort($result, function ($a, $b) {
            return strcmp($b['date'], $a['date']);
        });

        return response()->json([
            'data' => $result
        ]);
    }

    /**
     * Export report as CSV (bookings in date range with revenue)
     */
    public function exportReport(Request $request)
    {
        $ownerId = Auth::id();
        $courtIds = Court::where('owner_id', $ownerId)->pluck('id');

        if ($courtIds->isEmpty()) {
            return response()->json(['data' => []], 200);
        }

        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->toDateString());

        $bookings = CourtBooking::whereIn('court_id', $courtIds)
            ->where('date', '>=', $startDate)
            ->where('date', '<=', $endDate)
            ->with(['court:id,name,hourly_rate', 'user:id,name,email'])
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();

        $lines = [
            ['Date', 'Court', 'Customer', 'Email', 'Start', 'End', 'Status', 'Revenue (PHP)'],
        ];

        foreach ($bookings as $b) {
            $start = Carbon::parse($b->date . ' ' . $b->start_time);
            $end = Carbon::parse($b->date . ' ' . $b->end_time);
            $hours = $start->diffInMinutes($end) / 60;
            $revenue = $b->status === 'confirmed'
                ? round($hours * ($b->court->hourly_rate ?? 0), 2)
                : 0;
            $lines[] = [
                $b->date,
                $b->court->name ?? '',
                $b->user->name ?? '',
                $b->user->email ?? '',
                $b->start_time,
                $b->end_time,
                $b->status,
                (string) $revenue,
            ];
        }

        $csv = implode("\n", array_map(function ($row) {
            return implode(',', array_map(function ($cell) {
                return '"' . str_replace('"', '""', $cell) . '"';
            }, $row));
        }, $lines));

        $filename = 'report_' . $startDate . '_' . $endDate . '.csv';
        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
