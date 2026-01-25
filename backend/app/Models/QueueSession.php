<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QueueSession extends Model
{
    protected $fillable = [
        'owner_id',
        'date',
        'start_time',
        'end_time',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function entries()
    {
        return $this->hasMany(QueueEntry::class);
    }

    public function matches()
    {
        return $this->hasMany(QueueMatch::class, 'queue_session_id');
    }
}
