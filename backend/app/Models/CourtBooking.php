<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourtBooking extends Model
{
    protected $fillable = [
        'court_id',
        'user_id',
        'date',
        'start_time',
        'end_time',
        'status',
        'shuttlecock_count',
        'shuttlecock_cost',
        'started_at',
        'ended_at',
        'payment_status',
    ];

    protected $casts = [
        'shuttlecock_cost' => 'float',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function court()
    {
        return $this->belongsTo(Court::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
