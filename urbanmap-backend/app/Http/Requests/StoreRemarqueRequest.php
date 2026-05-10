<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRemarqueRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string|\Illuminate\Contracts\Validation\ValidationRule>|string>
     */
    public function rules(): array
    {
        return [
            'zone_id' => ['required', 'exists:zones,id'],
            'categorie' => ['required', 'string', 'max:255'],
            'statut' => ['nullable', Rule::in(['en_attente', 'validee', 'rejete', 'planifie'])],
            'building_type' => ['nullable', 'string', 'max:255'],
            'reasons' => ['required', 'array'],
            'problems' => ['required', 'array'],
            'urgency' => ['required', 'integer', 'between:1,5'],
            'profile' => ['required', 'string', 'max:255'],
            'residence_duration' => ['required', 'string', 'max:255'],
            'opinion' => ['required', 'string'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
        ];
    }
}
