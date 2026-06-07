<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreZoneRequest extends FormRequest
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
     * @return array<string, string>
     */
    public function rules(): array
    {
        return [
            'nom' => 'required|string|max:255',
            'ville' => 'required|string|max:255',
            'couleur' => 'required|string|max:20',
            'coordonnees_geojson' => 'required|array',
            'centre_lat' => 'required|numeric',
            'centre_lng' => 'required|numeric',
            'notes' => 'nullable|string|max:2000',
            'remark_ids' => 'sometimes|array',
            'remark_ids.*' => 'integer|exists:remarques,id',
        ];
    }
}
