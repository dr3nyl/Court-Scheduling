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
        Schema::table('queue_matches', function (Blueprint $table) {
            $table->unsignedInteger('shuttlecocks_used')->nullable()->after('end_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('queue_matches', function (Blueprint $table) {
            $table->dropColumn('shuttlecocks_used');
        });
    }
};
