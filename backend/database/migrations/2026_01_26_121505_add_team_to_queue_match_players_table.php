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
        Schema::table('queue_match_players', function (Blueprint $table) {
            $table->string('team', 1)->default('A')->after('queue_entry_id'); // 'A' or 'B'
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('queue_match_players', function (Blueprint $table) {
            $table->dropColumn('team');
        });
    }
};
