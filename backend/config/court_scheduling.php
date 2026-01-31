<?php

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

];
