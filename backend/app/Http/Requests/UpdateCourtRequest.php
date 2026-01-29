<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCourtRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by controller/middleware
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:50',
            'is_active' => 'sometimes|boolean',
            'hourly_rate' => 'nullable|numeric|min:0',
            'reservation_fee_percentage' => 'nullable|numeric|min:0|max:100',
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
            'name.required' => 'Court name is required.',
            'name.max' => 'Court name cannot exceed 50 characters.',
            'is_active.boolean' => 'Active status must be true or false.',
            'hourly_rate.numeric' => 'Hourly rate must be a valid number.',
            'hourly_rate.min' => 'Hourly rate cannot be negative.',
            'reservation_fee_percentage.numeric' => 'Reservation fee percentage must be a valid number.',
            'reservation_fee_percentage.min' => 'Reservation fee percentage cannot be negative.',
            'reservation_fee_percentage.max' => 'Reservation fee percentage cannot exceed 100%.',
        ];
    }
}
