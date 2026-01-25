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
        'status'
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
