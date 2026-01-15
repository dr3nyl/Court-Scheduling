<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourtAvailability extends Model
{
    protected $fillable = [
        'court_id',
        'day_of_week',
        'open_time',
        'close_time'
    ];

    public function court()
    {
        return $this->belongsTo(Court::class);
    }
}
