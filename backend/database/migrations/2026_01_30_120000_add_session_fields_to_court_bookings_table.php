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
        Schema::table('court_bookings', function (Blueprint $table) {
            $table->unsignedInteger('shuttlecock_count')->nullable()->after('status');
            $table->timestamp('started_at')->nullable()->after('shuttlecock_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('court_bookings', function (Blueprint $table) {
            $table->dropColumn(['shuttlecock_count', 'started_at']);
        });
    }
};
