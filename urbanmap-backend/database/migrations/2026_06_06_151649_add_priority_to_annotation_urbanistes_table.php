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
        Schema::table('annotation_urbanistes', function (Blueprint $table) {
            $table->string('priorite')->default('informatif')->after('texte');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('annotation_urbanistes', function (Blueprint $table) {
            $table->dropColumn('priorite');
        });
    }
};
