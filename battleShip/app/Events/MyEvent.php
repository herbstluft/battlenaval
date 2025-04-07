<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MyEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $game;

    public function __construct($game)
    {
        $this->game = $game;
    }

    public function broadcastOn()
    {
        return new Channel('game-channel'); // Canal donde se escuchará
    }

    public function broadcastAs()
    {
        return 'game.' . $this->game->id . '.join'; // Evento dinámico por defecto
    }
}
