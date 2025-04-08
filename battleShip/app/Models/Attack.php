<?php

namespace App\Models;

use Jenssegers\Mongodb\Eloquent\Model;

class Attack extends Model
{
    protected $connection = 'mongodb';
    protected $collection = 'attacks';

    protected $fillable = [
        'game_id',
        'attacker_id',
        'target_id',
        'row',
        'col',
        'is_hit',
        'turn_number',
        'created_at'
    ];

    // Relationships
    public function game()
    {
        return $this->belongsTo(Game::class);
    }

    public function attacker()
    {
        return $this->belongsTo(User::class, 'attacker_id');
    }
}