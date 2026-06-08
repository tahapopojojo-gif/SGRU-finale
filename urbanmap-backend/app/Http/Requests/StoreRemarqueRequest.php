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
            'zone_id' => ['nullable', 'exists:zones,id'],
            'categorie' => ['required', 'string', 'max:255'],
            'statut' => ['nullable', Rule::in(['en_attente', 'en_cours', 'resolu', 'rejete'])],
            'building_type' => ['nullable', 'string', 'max:255'],
            'reasons' => ['required', 'array'],
            'problems' => ['required', 'array'],
            'urgency' => ['required', 'integer', 'between:1,5'],
            'duration' => ['nullable', 'string', 'max:255'],
            'profile' => ['nullable', 'string', 'max:255'],
            'residence_duration' => ['nullable', 'string', 'max:255'],
            'opinion' => ['required', 'string'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (!$this->has('profile') || empty($this->profile)) {
            $this->merge(['profile' => 'citoyen']);
        }
        if (!$this->has('residence_duration') || empty($this->residence_duration)) {
            $this->merge(['residence_duration' => 'non_renseigne']);
        }
    }
}
