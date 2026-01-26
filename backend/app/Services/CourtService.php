<?php

namespace App\Services;

use App\Models\Court;
use App\Models\CourtAvailability;
use App\Models\CourtBooking;
use Carbon\Carbon;

class CourtService
{
    /**
     * Get available time slots for a court on a specific date.
     */
    public function getAvailableTimeSlots(Court $court, string $date): array
    {
        $dayOfWeek = Carbon::parse($date)->dayOfWeek; // 0=Sunday, 1=Monday, ..., 6=Saturday

        // Find availability for this day of week
        $availability = CourtAvailability::where('court_id', $court->id)
            ->where('day_of_week', $dayOfWeek)
            ->first();

        // If no availability for this day, return empty slots
        if (!$availability) {
            return [];
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

        return $slots;
    }
}
