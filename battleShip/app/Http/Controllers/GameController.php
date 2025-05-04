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
use App\Models\Attack;

class GameController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');

    }

    public function available()
    {
        $userId = Auth::id();

        // Get games where user is player1 and in progress
        $myGames = Game::where('status', '=', 'in_progress')
            ->where(function($query) use ($userId) {
                $query->where('player1_id', $userId)
                      ->orWhere('player2_id', $userId);
            })
            ->with(['player1', 'player2'])
            ->get();
        // Get available games to join (waiting and no player2)
        $availableGames = Game::where('status', 'waiting')
            ->whereNull('player2_id')
            ->where('player1_id', '!=', $userId) // Exclude user's own games
            ->with('player1')
            ->get();

        return response()->json([
            'my_games' => $myGames,
            'available_games' => $availableGames
        ]);
    }

    public function create(Request $request)
    {
        // Check if user has any active game (waiting or in_progress)
        $activeGame = Game::where('status', '!=', 'finished')
            ->where(function($query) {
                $query->where('player1_id', Auth::id())
                      ->orWhere('player2_id', Auth::id());
            })
            ->first();

        if ($activeGame) {
            $message = $activeGame->status === 'waiting' 
                ? 'Ya estás esperando una partida en curso.'
                : 'Ya tienes una partida en progreso.';
                
            return response()->json([
                'message' => $message,
                'game' => $activeGame
            ], 400);
        }

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
    $currentUser = Auth::id();
    
    if (empty($currentUser)) {
        return response()->json(['message' => 'No puedes unirte a esta partida'], 403);
    }

    // Check if user is already part of this game
    if ($currentUser === $game->player1_id || $currentUser === $game->player2_id) {
        // Load the game state and return it
        $game->load(['player1', 'player2']);
        
        // Get all previous attacks
        $attacks = Attack::where('game_id', $game->id)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'message' => 'Volviendo a la partida',
            'status' => 'rejoined',
            'game' => $game,
            'attacks' => $attacks
        ]);
    }

    // Check if game is available
    if ($game->status !== 'waiting' || $game->player2_id !== null) {
        return response()->json([
            'message' => 'Esta partida ya no está disponible',
            'status' => 'unavailable'
        ], 400);
    }

    try {
        // Join as new player2
        $game->update([
            'player2_id' => $currentUser,
            'player2_board' => $this->initializeRandomBoard(),
            'status' => 'in_progress',
            'current_turn' => $game->player1_id,
            'player2_shots' => []
        ]);

        $game->load(['player1', 'player2']);
        
        event(new MyEvent($game));
        
        return response()->json([
            'message' => 'Te has unido a la partida',
            'status' => 'joined',
            'game' => $game
        ]);
    } catch (\Exception $e) {
        \Log::error('Error joining game: ' . $e->getMessage());
        return response()->json([
            'message' => 'Error al unirse a la partida',
            'error' => $e->getMessage()
        ], 500);
    }
}
        
        public function status(Game $game)
    {
        $game->load(['player1', 'player2']);
        
        return response()->json($game);
    }
  
    
  
    public function getBoard(Game $game)
    {
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
        $shipsToPlace = 15; // Número total de barcos
        
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
            'index' => 'required',
            'playerId' => 'required',
            'isHit' =>'required|boolean'
        ]);


// Actualizar tablero de oponente
$playerAttack = $validated['playerId'];
$indexAttack = $validated['index'];

// Query to get opponent's board based on player ID
$game = Game::findOrFail($gameId);


// Actualiza el barco al que se le dio
                // Determine which board to return based on the attacking player
                $opponentBoard = $playerAttack === $game->player1_id 
                    ? $game->player1_board  // If player1 is attacking, get player2's board
                    : $game->player2_board; // If player2 is attacking, get player1's board

                // Convert board to array if it's a JSON string
                if (is_string($opponentBoard)) {
                    $opponentBoard = json_decode($opponentBoard, true);
                }

                // Calculate row and column for index
                $row = floor($indexAttack / 8);
                $col = $indexAttack % 8;

                // Update the cell at the target position
                $opponentBoard[$row][$col] = [
                    'hasShip' => $validated['isHit'], // Set hasShip based on hit validation
                    'isHit' => $validated['isHit'],   // Set hit status
                    'isMiss' => !$validated['isHit']  // Set miss status (opposite of hit)
                ];

                // Save the updated board back to the game
                if ($playerAttack === $game->player1_id) {
                    $game->player1_board = $opponentBoard;
                } else {
                    $game->player2_board = $opponentBoard;
                }
                $game->save();
// Actualiza el barco al que se le dio


$targetCell = $opponentBoard[$row][$col];

        // Determinar quién es el atacante y el oponente
        $attacker = $game->current_turn === $game->player1_id ? $game->player1_id : $game->player2_id;
        $opponent = $game->current_turn === $game->player1_id ? $game->player2_id : $game->player1_id;

    if ($attacker === $opponent) {
        return response()->json([
            'error' => 'El atacante no puede atacar a sí mismo.'
        ], 400);
    }

    // Obtener y decodificar los tableros
    $attackerBoardJson = $game->{$attacker . '_board'};
    $opponentBoardJson = $game->{$opponent . '_board'};

    $attackerBoard = json_decode($attackerBoardJson, true);
    $opponentBoard = json_decode($opponentBoardJson, true);

    // Asegurarse de que los tableros estén correctamente formateados
    if (!is_array($attackerBoard) || count($attackerBoard) === 0) {
        $attackerBoard = $this->initializeRandomBoard();
    }
    if (!is_array($opponentBoard) || count($opponentBoard) === 0) {
        $opponentBoard = $this->initializeRandomBoard();
    }

    $row = $validated['row'];
    $col = $validated['col'];

    $accert = $validated['isHit'];
    // Asegurar que la celda existe y está bien definida
    $cell = $opponentBoard[$row][$col] ?? null;


    $hit = is_array($cell) && isset($cell['hasShip']) ? $cell['hasShip'] : false;
        
    // Registrar el ataque
        $attack = Attack::create([
            'game_id' => $gameId,
            'attacker_id' => $attacker,
            'target_id' => $opponent,
        'row' => $row,
        'col' => $col,
        'is_hit' => $accert,
            'turn_number' => Attack::where('game_id', $gameId)->count() + 1,
            'created_at' => now()
        ]);

    // Actualizar la celda atacada en el tablero del oponente
    $opponentBoard[$row][$col] = [
        'hasShip' => $hit,
        'isHit' => $hit,
        'isMiss' => !$hit
    ];

    // Cambiar el turno
    $game->current_turn = $attacker === $game->player1_id ? $game->player2_id : $game->player1_id;

    // Guardar los cambios del tablero
        $game->update([
        $opponent . '_board' => json_encode($opponentBoard),
        ]);

    // Notificar el cambio de turno
        event(new ReadChangeTurn($game));

        return response()->json([
        'message' => $hit ? '¡Acertaste!' : 'Fallaste.',
        'hit' => $hit,
            'attack_id' => $attack->_id
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


public function getGameHistory()
{
    $userId = Auth::id();
    
    $games = Game::where(function($query) use ($userId) {
        $query->where('player1_id', $userId)
              ->orWhere('player2_id', $userId);
    })
    ->where('status', 'finished')
    ->orderBy('created_at', 'desc')
    ->get();

    if ($games->isEmpty()) {
        return response()->json([
            'message' => 'No hay partidas jugadas',
            'games' => []
        ]);
    }

    $formattedGames = $games->map(function ($game) use ($userId) {
        $winner = Winner::where('winner_id', $game->winner_id)
                       ->first();

        // Convert UTC to America/Mexico_City timezone
        $gameDate = $game->created_at->setTimezone('America/Mexico_City');
        $completedAt = $game->completed_at ? $game->completed_at->setTimezone('America/Mexico_City') : null;

        return [
            'id' => $game->id,
            'date' => $gameDate->format('Y-m-d H:i:s'),
            'completed_at' => $completedAt ? $completedAt->format('Y-m-d H:i:s') : null,
            'winner_id' => $game->winner_id,
            'player1_id' => $game->player1_id,
            'player2_id' => $game->player2_id,
            'status' => $game->status,
            'total_moves' => $winner ? $winner->allshots : 0,
            'accuracy' => $winner ? $winner->presicion : 0,
            'is_winner' => $game->winner_id === $userId
        ];
    });

    return response()->json($formattedGames);
}
    
public function getGameDetails($id)
{
    $game = Game::findOrFail($id);
    $userId = Auth::id();

    // Get all attacks for this game
    $attacks = Attack::where('game_id', $id)
        ->orderBy('turn_number', 'asc')
        ->get();

    // Get boards and handle both string and array formats
    $player_board = $game->player1_id === $userId ? $game->player1_board : $game->player2_board;
    $opponent_board = $game->player1_id === $userId ? $game->player2_board : $game->player1_board;

    // Convert boards to arrays if they're strings
    if (is_string($player_board)) {
        $player_board = json_decode($player_board, true);
    }
    if (is_string($opponent_board)) {
        $opponent_board = json_decode($opponent_board, true);
    }

    // Format the response
    $response = [
        'id' => $game->id,
        'date' => $game->created_at,
        'winner_id' => $game->winner_id,
        'player1_id' => $game->player1_id,
        'player2_id' => $game->player2_id,
        'status' => $game->status,
        'completed_at' => $game->updated_at,
        'attacks' => $attacks,
        'player_role' => $game->player1_id === $userId ? 'player1' : 'player2',
        'final_boards' => [
            'player_board' => $player_board,
            'opponent_board' => $opponent_board
        ]
    ];

    return response()->json($response);
}

public function checkUserActiveGame(Request $request)
{
    $user = $request->user();
    
    $activeGame = Game::where(function($query) use ($user) {
        $query->where('player1_id', $user->id)
              ->orWhere('player2_id', $user->id);
    })
    ->where('status', '!=', 'finished')
    ->first();

    return response()->json([
        'hasGame' => !is_null($activeGame),
        'gameId' => $activeGame ? $activeGame->id : null
    ]);
}


}




