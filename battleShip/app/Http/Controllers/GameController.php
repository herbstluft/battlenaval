<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Events\MyEvent;
use App\Events\ReadCreated;
use App\Events\ReadChangeTurn;
use App\Events\GameOver;
use App\Models\Winner;

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
            'player1_board' => $this->initializeRandomBoard(),
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
            'player2_board' => $this->initializeRandomBoard(),
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

    private function initializeRandomBoard()
    {
        $board = [];
        $shipsToPlace = 1; // Número total de barcos
        
        // Crear un tablero vacío de 8x8
        for ($i = 0; $i < 8; $i++) {
            for ($j = 0; $j < 8; $j++) {
                $board[$i][$j] = [
                    'hasShip' => false,
                    'isHit' => false,
                    'isMiss' => false
                ];
            }
        }
        
        // Colocar barcos aleatoriamente
        $shipsPlaced = 0;
        while ($shipsPlaced < $shipsToPlace) {
            $row = rand(0, 7);
            $col = rand(0, 7);
            
            if (!$board[$row][$col]['hasShip']) {
                $board[$row][$col]['hasShip'] = true;
                $shipsPlaced++;
            }
        }
        
        return $board;
    }


    public function getGameState($gameId)
    {
        $game = Game::findOrFail($gameId);
    
        // Obtener los tableros de ambos jugadores
        $player1Board = is_string($game->player1_board) ? json_decode($game->player1_board, true) : $game->player1_board;
        $player2Board = is_string($game->player2_board) ? json_decode($game->player2_board, true) : $game->player2_board;
    
        // Si las celdas están en un solo array (cells), convertirlo en un array bidimensional de 8x8
        $player1Board = $this->convertCellsToBoard($player1Board);
        $player2Board = $this->convertCellsToBoard($player2Board);
    
        return response()->json([
            'myBoard' => $game->current_turn === 'player1' ? $player1Board : $player2Board,
            'opponentBoard' => $game->current_turn === 'player1' ? $player2Board : $player1Board,
            'currentTurn' => $game->current_turn,
            'player1_id' => $game->player1_id,  // Añade esto
            'player2_id' => $game->player2_id   // Añade esto

        ]);
    }
    
    private function convertCellsToBoard($board)
    {
        // Si board tiene una propiedad 'cells', convertirla en un array de 8x8
        if (isset($board['cells']) && is_array($board['cells'])) {
            $cells = $board['cells'];
            $boardArray = [];
    
            // Convertir el array de 100 celdas en un array 8x8
            for ($i = 0; $i < 8; $i++) {
                $boardArray[] = array_slice($cells, $i * 8, 8);
            }
    
            // Reemplazar el array original de celdas por el nuevo array 8x8
            return $boardArray;
        }
    
        return $board;
    }
    
    
    public function attackCell(Request $request, $gameId)
    {
        $game = Game::findOrFail($gameId);
    
        // Validar la entrada
        $validated = $request->validate([
            'row' => 'required|integer|min:0|max:7',
            'col' => 'required|integer|min:0|max:7',
        ]);
    
        // Determinar quién es el atacante y quién el oponente
        $attacker = $game->current_turn === $game->player1_id ? $game->player1_id : $game->player2_id;
        $opponent = $game->current_turn === $game->player1_id ? $game->player2_id : $game->player1_id;
    
        // Verificar que no se ataque a uno mismo
        if ($attacker === $opponent) {
            return response()->json([
                'error' => 'El atacante no puede atacar a sí mismo.'
            ], 400);
        }
    
        // Verificar si los tableros existen en la base de datos y decodificarlos correctamente
        $attackerBoard = json_decode($game->{$attacker . '_board'}, true);
        $opponentBoard = json_decode($game->{$opponent . '_board'}, true);
    
        // Si los tableros son nulos o vacíos, inicializarlos con una estructura vacía
        if (is_null($attackerBoard)) {
            $attackerBoard = $this->initializeRandomBoard();  // Inicializar el tablero del atacante
        }
        if (is_null($opponentBoard)) {
            $opponentBoard = $this->initializeRandomBoard();  // Inicializar el tablero del oponente
        }
    
        // Revisar si la celda es un golpe  
        $hit = $opponentBoard[$validated['row']][$validated['col']]['hasShip'];
    
        // Actualizar el tablero del oponente
        $opponentBoard[$validated['row']][$validated['col']] = [
            'hasShip' => false, // Marca la celda como vacía
            'isHit' => $hit,    // Indica si fue un golpe
            'isMiss' => !$hit  // Indica si fue un fallo
        ];
    
        // Actualizar el turno correctamente
        $game->current_turn = $attacker === $game->player1_id ? $game->player2_id : $game->player1_id;
    
        // Guardar el juego con los cambios en los tableros y turno
        $game->update([
            $attacker . '_board' => json_encode($attackerBoard),
            $opponent . '_board' => json_encode($opponentBoard),
        ]);
    
        // Evento para notificar que se cambio de turno de ataque
        event(new ReadChangeTurn($game));

        // Responder con el resultado del ataque
        return response()->json([
            'message' => $hit ? '¡Acertaste!' : 'Fallaste.',
            'hit' => $hit
        ]);
    }
    
    public function gameOver(Request $request, $id)
    {
        try {
            $game = Game::findOrFail($id);
            $winnerId = $request->input('winnerId');
            $gameStats = $request->input('gameStats');
    
            // Update game status
            $game->update([
                'status' => 'finished',
                'winner_id' => $winnerId,
                'updated_at' => now()
            ]);

            $winner = Winner::create([
                'winner_id' => $winnerId,
                'allshots' => $gameStats['total_moves'],
                'asserts' => $gameStats['hits'],
                'fails' => $gameStats['misses'],
                'presicion' => $gameStats['accuracy'],
                'boats_hints' => $gameStats['hits'] // Since each hit is a boat in this case
            ]);

            event(new GameOver($game));
            
            return response()->json([
                'message' => 'Game completed successfully',
                'game' => $game,
                'winner_id' => $winnerId,
                'statistics' => $gameStats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error updating game status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    
public function getUserStats()
{
    $userId = Auth::id();
    
    // Get total games
    $totalGames = Game::where(function($query) use ($userId) {
        $query->where('player1_id', $userId)
              ->orWhere('player2_id', $userId);
    })
    ->where('status', 'finished')
    ->count();

    // Get victories
    $victories = Game::where('winner_id', $userId)
        ->where('status', 'finished')
        ->count();

    $accuracy = Winner::where('winner_id', $userId)
        ->avg('presicion') ?? 0;

    return response()->json([
        'totalGames' => $totalGames,
        'victories' => $victories,
        'accuracy' => round($accuracy, 1)
    ]);
}
    
}


