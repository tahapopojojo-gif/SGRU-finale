<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('remarques', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('zone_id')->constrained()->cascadeOnDelete();
            $table->string('categorie');
            $table->enum('statut', ['en_attente', 'validee', 'rejete', 'planifie'])->default('en_attente');
            $table->string('building_type')->nullable();
            $table->json('reasons');
            $table->json('problems');
            $table->unsignedTinyInteger('urgency');
            $table->string('profile');
            $table->string('residence_duration');
            $table->text('opinion');
            $table->boolean('opinion_ai_validated')->default(false);
            $table->text('opinion_ai_summary')->nullable();
            $table->text('commentaire_admin')->nullable();
            $table->string('photo_path')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('remarques');
    }
};
