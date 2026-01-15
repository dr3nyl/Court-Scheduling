<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\CourtAvailabilityController;
use App\Http\Controllers\CourtBookingController;
use App\Http\Controllers\CourtController;
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
    
    Route::get('/courts/{court}/bookings', [CourtBookingController::class, 'index']);
    Route::post('/courts/{court}/bookings', [CourtBookingController::class, 'store']);
    Route::delete('/bookings/{booking}', [CourtBookingController::class, 'destroy']);
});
