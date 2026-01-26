<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QueueMatch extends Model
{
    protected $fillable = [
        'queue_session_id',
        'court_id',
        'status',
        'start_time',
        'end_time',
        'shuttlecocks_used',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
        ];
    }

    public function queueSession()
    {
        return $this->belongsTo(QueueSession::class);
    }

    public function court()
    {
        return $this->belongsTo(Court::class);
    }

    public function queueMatchPlayers()
    {
        return $this->hasMany(QueueMatchPlayer::class, 'queue_match_id');
    }

    public function queueEntries()
    {
        return $this->hasManyThrough(
            QueueEntry::class,
            QueueMatchPlayer::class,
            'queue_match_id',
            'id',
            'id',
            'queue_entry_id'
        );
    }
}
