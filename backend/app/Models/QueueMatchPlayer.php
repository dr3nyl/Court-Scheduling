<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QueueMatchPlayer extends Model
{
    protected $fillable = [
        'queue_match_id',
        'queue_entry_id',
        'team',
    ];

    public function queueMatch()
    {
        return $this->belongsTo(QueueMatch::class);
    }

    public function queueEntry()
    {
        return $this->belongsTo(QueueEntry::class);
    }
}
