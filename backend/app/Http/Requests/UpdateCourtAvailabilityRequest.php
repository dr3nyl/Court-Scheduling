<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCourtAvailabilityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by controller policy
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'open_time' => 'sometimes|required|date_format:H:i',
            'close_time' => 'sometimes|required|date_format:H:i|after:open_time',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'open_time.required' => 'Open time is required.',
            'open_time.date_format' => 'Open time must be in HH:mm format.',
            'close_time.required' => 'Close time is required.',
            'close_time.date_format' => 'Close time must be in HH:mm format.',
            'close_time.after' => 'Close time must be after open time.',
        ];
    }
}
