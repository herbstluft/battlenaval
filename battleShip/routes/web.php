<?php

use Illuminate\Support\Facades\Route;
use App\Events\MyEvent;
use App\Http\Controllers\GameController;


/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/



Route::post('/test-broadcast', function () {
    // Aquí debes emitir el evento
    event(new MyEvent('¡Hola desde Laravel!')); 
    return response()->json(['status' => 'OK', 'message' => 'Evento enviado']);
});



Route::post('/games/{game}/join', [GameController::class, 'join']);



Route::get('/', function () {
    return view('welcome');
});
