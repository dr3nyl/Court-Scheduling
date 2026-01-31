<?php

namespace App\Enums;

/**
 * Maximum number of days in advance a player can book a court.
 * Used to limit the booking window (e.g. players can only book up to 7 days ahead).
 * Later this can be driven by an owner "settings" module.
 */
enum AdvanceBookingDays: int
{
    case Default = 7;
}
