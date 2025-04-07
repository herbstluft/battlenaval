<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Events\MyEvent;
use App\Events\ReadCreated;

class GameController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');

    }

    public function available()
    {
        $availableGames = Game::where('status', 'waiting')
            ->whereNull('player2_id')
            ->with('player1')
            ->get();

        return response()->json($availableGames);
    }

    public function create(Request $request)
    {
        $game = Game::create([
            'player1_id' => Auth::id(),
            'status' => 'waiting',
            'player1_board' => $request->board,
            'player1_shots' => [],
            'player2_shots' => []
        ]);

        $game->load('player1');


        event(new ReadCreated($game));
        return response()->json($game);
    }

    public function join(Game $game)
    {
        if (empty(Auth::user())) {
            return response()->json(['message' => 'No puedes unirte a esta partida'], 403);
        }

        $game->update([
            'player2_id' => Auth::id(),
            'status' => 'in_progress',
            'current_turn' => $game->player1_id
        ]);

        event(new MyEvent($game));
        return response()->json($game->load(['player1', 'player2']));
     }
        
        public function status(Game $game)
    {
        $game->load(['player1', 'player2']);
        
        return response()->json($game);
    }
  
    
    public function makeMove(Request $request, Game $game)
    {
        if ($game->current_turn !== Auth::id()) {
            return response()->json(['message' => 'No es tu turno'], 403);
        }

        $x = $request->x;
        $y = $request->y;
        
        $isPlayer1 = Auth::id() === $game->player1_id;
        $shots = $isPlayer1 ? 'player1_shots' : 'player2_shots';
        $targetBoard = $isPlayer1 ? 'player2_board' : 'player1_board';
        
        // Registrar el disparo
        $currentShots = $game->$shots;
        $currentShots[] = ['x' => $x, 'y' => $y];
        $game->$shots = $currentShots;
        
        // Verificar si es hit o miss
        $targetBoardData = $game->$targetBoard;
        $isHit = false;
        
        // Verificar que $targetBoardData no sea null antes de iterar
        if ($targetBoardData && is_array($targetBoardData)) {
            foreach ($targetBoardData as $ship) {
                // Verificar que el barco tenga la clave 'positions' y sea un array
                if (isset($ship['positions']) && is_array($ship['positions'])) {
                    if (in_array(['x' => $x, 'y' => $y], $ship['positions'])) {
                        $isHit = true;
                        break;
                    }
                }
            }
        }
        
        // Cambiar turno
        $game->current_turn = $isPlayer1 ? $game->player2_id : $game->player1_id;
        $game->save();
        
        return response()->json([
            'game' => $game->load(['player1', 'player2']),
            'hit' => $isHit
        ]);
    }
    
    public function getBoard(Game $game)
    {
        // Verificar si el usuario autenticado es uno de los jugadores
        $userId = Auth::id();
        if ($userId !== $game->player1_id && $userId !== $game->player2_id) {
            return response()->json(['message' => 'No tienes permiso para ver este tablero'], 403);
        }
        
        $isPlayer1 = $userId === $game->player1_id;
        
        // Obtener el tablero del jugador y los disparos del oponente
        $playerBoard = $isPlayer1 ? $game->player1_board : $game->player2_board;
        $opponentShots = $isPlayer1 ? $game->player2_shots : $game->player1_shots;
        
        // Obtener los disparos del jugador y el tablero del oponente (con información limitada)
        $playerShots = $isPlayer1 ? $game->player1_shots : $game->player2_shots;
        $opponentBoard = $isPlayer1 ? $game->player2_board : $game->player1_board;
        
        // Procesar el tablero del oponente para mostrar solo los barcos impactados
        $processedOpponentBoard = [];
        if ($opponentBoard) {
            foreach ($opponentBoard as $ship) {
                // Verificar si existe la clave 'positions' en el barco
                if (!isset($ship['positions']) || !is_array($ship['positions'])) {
                    continue; // Saltar este barco si no tiene posiciones válidas
                }
                
                $hitPositions = [];
                foreach ($ship['positions'] as $position) {
                    if (in_array($position, $playerShots)) {
                        $hitPositions[] = $position;
                    }
                }
                
                if (count($hitPositions) > 0) {
                    $processedOpponentBoard[] = [
                        'type' => isset($ship['type']) ? $ship['type'] : 'unknown',
                        'hit_positions' => $hitPositions
                    ];
                }
            }
        }
        
        return response()->json([
            'player_board' => $playerBoard,
            'opponent_shots' => $opponentShots,
            'player_shots' => $playerShots,
            'opponent_board_hits' => $processedOpponentBoard,
            'is_player_turn' => $game->current_turn === $userId,
            'game_status' => $game->status
        ]);
    }
}