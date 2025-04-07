<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Game extends Model
{
    use HasFactory;

    protected $fillable = [
        'player1_id',
        'player2_id',
        'status',
        'current_turn',
        'winner_id',
        'player1_board',
        'player2_board',
        'player1_shots',
        'player2_shots'
    ];

    protected $casts = [
        'player1_board' => 'array',
        'player2_board' => 'array',
        'player1_shots' => 'array',
        'player2_shots' => 'array'
    ];

    public function player1()
    {
        return $this->belongsTo(User::class, 'player1_id');
    }

    public function player2()
    {
        return $this->belongsTo(User::class, 'player2_id');
    }

    public function winner()
    {
        return $this->belongsTo(User::class, 'winner_id');
    }

    public function isAvailable()
    {
        return $this->status === 'waiting' && !$this->player2_id;
    }

    public function canJoin(User $user)
    {
        return $this->isAvailable() && $this->player1_id !== $user->id;
    }
}