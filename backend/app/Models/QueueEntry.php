<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QueueEntry extends Model
{
    protected $fillable = [
        'queue_session_id',
        'user_id',
        'guest_name',
        'level',
        'phone',
        'notes',
        'status',
        'games_played',
        'joined_at',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'decimal:1',
            'joined_at' => 'datetime',
        ];
    }

    public function queueSession()
    {
        return $this->belongsTo(QueueSession::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function queueMatchPlayers()
    {
        return $this->hasMany(QueueMatchPlayer::class, 'queue_entry_id');
    }

    /**
     * Display name: user's name or guest_name.
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->user_id ? ($this->user?->name ?? '') : (string) $this->guest_name;
    }
}
