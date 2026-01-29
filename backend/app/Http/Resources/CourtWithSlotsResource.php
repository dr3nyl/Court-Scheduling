<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourtWithSlotsResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'hourly_rate' => $this->hourly_rate,
            'reservation_fee_percentage' => $this->reservation_fee_percentage ?? 0,
            'slots' => $this->when(isset($this->slots), $this->slots),
        ];
    }
}
