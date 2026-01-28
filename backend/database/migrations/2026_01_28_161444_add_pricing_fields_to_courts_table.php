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
        Schema::table('courts', function (Blueprint $table) {
            $table->decimal('hourly_rate', 10, 2)->nullable()->after('is_active');
            $table->decimal('reservation_fee_percentage', 5, 2)->default(0)->after('hourly_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courts', function (Blueprint $table) {
            $table->dropColumn(['hourly_rate', 'reservation_fee_percentage']);
        });
    }
};
