<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Usercontroller;
use App\Http\Controllers\GameController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/
// routes/api.php

Route::get('/sanctum/csrf-cookie', function () {
    return response()->json(['message' => 'CSRF token set'])->withCookie(cookie('XSRF-TOKEN', csrf_token()));
});

Route::post('/login', [Usercontroller::class, 'login']);

Route::post('/register', [UserController::class, 'register']);
// Generacion de ruta firmada de Activacion de cuenta frontEnd
Route::get('/verifyAccount', [UserController::class, 'showVerifyPage'])->name('verify.account')->middleware('signed');
Route::post('/verify-code', [UserController::class, 'verifyCode']);



Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
    
});


// Rutas para el juego multijugador (protegidas)
    Route::get('/games/available', [GameController::class, 'available']);
    Route::post('/games', [GameController::class, 'create']);
    Route::post('/games/{game}/join', [GameController::class, 'join']);
    Route::post('/games/{game}/move', [GameController::class, 'makeMove']);
    //Route::get('/games/{game}', [GameController::class, 'status']);
    //Route::get('/games/{game}/status', [GameController::class, 'status']);
    Route::post('/games/{game}/board', [GameController::class, 'getBoard']);


    Route::middleware('auth:sanctum')->get('/games/{gameId}', [GameController::class, 'getGameState']);
    Route::middleware('auth:sanctum')->post('/games/{gameId}/attack', [GameController::class, 'attackCell']);
    Route::post('/games/{id}/gameover', [GameController::class, 'gameOver'])->middleware('auth:sanctum');
    // Add this with your other protected routes
    // Change the route to be more specific
    Route::middleware('auth:sanctum')->get('/games-history', [GameController::class, 'getGameHistory']);
    Route::middleware('auth:sanctum')->get('/games/{id}/details', [GameController::class, 'getGameDetails']);
    Route::middleware('auth:sanctum')->get('/user/stats', [GameController::class, 'getUserStats']);
    Route::middleware('auth:sanctum')->delete('/games/{id}', [GameController::class, 'cancelGame']);


    