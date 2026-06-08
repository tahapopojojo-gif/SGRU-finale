<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('remarques', function (Blueprint $table) {
            $table->enum('statut', ['en_attente', 'en_cours', 'resolu', 'rejete'])
                ->default('en_cours')
                ->change();
        });
    }

    public function down(): void
    {
        Schema::table('remarques', function (Blueprint $table) {
            $table->enum('statut', ['en_attente', 'validee', 'rejete', 'planifie'])
                ->default('en_attente')
                ->change();
        });
    }
};
