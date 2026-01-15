<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Court extends Model
{
    protected $fillable = ['owner_id', 'name', 'is_active'];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function availabilities()
    {
        return $this->hasMany(CourtAvailability::class);
    }
}
