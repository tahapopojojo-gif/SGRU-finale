<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['nom', 'couleur', 'icone'];

    public function remarques(): HasMany
    {
        return $this->hasMany(Remarque::class, 'categorie', 'nom');
    }
}
