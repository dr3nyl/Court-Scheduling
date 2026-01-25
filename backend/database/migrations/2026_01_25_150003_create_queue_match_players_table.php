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
        Schema::create('queue_match_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('queue_match_id')->constrained('queue_matches')->cascadeOnDelete();
            $table->foreignId('queue_entry_id')->constrained('queue_entries')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('queue_match_players');
    }
};
