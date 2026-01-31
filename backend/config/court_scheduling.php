<?php

use App\Enums\AdvanceBookingDays;
use App\Enums\ShuttlecockPrice;

return [

    /*
    |--------------------------------------------------------------------------
    | Shuttlecock price (per unit)
    |--------------------------------------------------------------------------
    |
    | Price per shuttlecock for additional payment when players use shuttlecocks
    | during a session. Set in App\Enums\ShuttlecockPrice.
    |
    */
    'shuttlecock_price' => ShuttlecockPrice::Default->value,

    /*
    |--------------------------------------------------------------------------
    | Advance booking limit (days)
    |--------------------------------------------------------------------------
    |
    | Players can only book up to this many days from today. Set in
    | App\Enums\AdvanceBookingDays. Later can be driven by owner settings.
    |
    */
    'advance_booking_days' => AdvanceBookingDays::Default->value,

];
