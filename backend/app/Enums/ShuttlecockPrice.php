<?php

namespace App\Enums;

/**
 * Default shuttlecock price (per unit) for court bookings.
 * Actual price used by the app comes from config, which may be overridden by .env (SHUTTLECOCK_PRICE).
 */
enum ShuttlecockPrice: int
{
    case Default = 120;
}
