<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\CourtAvailabilityController;
use App\Http\Controllers\CourtBookingController;
use App\Http\Controllers\CourtController;
use App\Http\Controllers\QueueEntryController;
use App\Http\Controllers\QueueMatchController;
use App\Http\Controllers\QueueSessionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


Route::get('/test', function () {
    return response()->json([
        'message' => 'Court Scheduling API is working'
    ]);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return response()->json($request->user());
});

Route::middleware(['auth:sanctum', 'owner'])->group(function () {
    Route::get('/courts', [CourtController::class, 'index']);
    Route::post('/courts', [CourtController::class, 'store']);
    Route::patch('/courts/{court}', [CourtController::class, 'update']);
    Route::get('/owner/bookings', [CourtBookingController::class, 'ownerBookings']);
    Route::get('/owner/stats', [CourtBookingController::class, 'ownerStats']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/owner/courts/{court}/availability', [CourtAvailabilityController::class, 'index']);
    Route::post('/owner/courts/{court}/availability', [CourtAvailabilityController::class, 'store']);
    Route::put('/owner/courts/{court}/availability/{availability}', [CourtAvailabilityController::class, 'update']);
    Route::delete('/owner/courts/{court}/availability/{availability}', [CourtAvailabilityController::class, 'destroy']);
});

Route::middleware('auth:sanctum')->group(function () {
    // Player-facing endpoint to get available courts with slots
    Route::get('/player/courts', [CourtController::class, 'availableForPlayers']);
    Route::get('/player/bookings', [CourtBookingController::class, 'userBookings']);

    Route::get('/courts/{court}/bookings', [CourtBookingController::class, 'index']);
    Route::post('/courts/{court}/bookings', [CourtBookingController::class, 'store']);
    Route::delete('/bookings/{booking}', [CourtBookingController::class, 'destroy']);
});

// Queue: sessions and entries (owner or queue_master)
Route::middleware(['auth:sanctum', 'queue_master_or_owner'])->prefix('queue')->group(function () {
    Route::get('/users', [QueueSessionController::class, 'searchUsers']);
    Route::get('/owners', [QueueSessionController::class, 'owners']);
    Route::get('/sessions', [QueueSessionController::class, 'index']);
    Route::post('/sessions', [QueueSessionController::class, 'store']);
    Route::get('/sessions/{session}', [QueueSessionController::class, 'show']);
    Route::patch('/sessions/{session}', [QueueSessionController::class, 'update']);
    Route::get('/sessions/{session}/available-courts', [QueueSessionController::class, 'availableCourts']);
    Route::get('/sessions/{session}/courts', [QueueSessionController::class, 'allCourts']);
    Route::post('/sessions/{session}/suggest-match', [QueueSessionController::class, 'suggestMatch']);
    Route::get('/sessions/{session}/entries', [QueueSessionController::class, 'entries']);
    Route::post('/sessions/{session}/entries', [QueueSessionController::class, 'storeEntry']);
    Route::patch('/entries/{entry}', [QueueEntryController::class, 'update']);
    Route::delete('/entries/{entry}', [QueueEntryController::class, 'destroy']);
    Route::post('/matches', [QueueMatchController::class, 'store']);
    Route::patch('/matches/{match}', [QueueMatchController::class, 'update']);
});
