<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player1_id')->constrained('users');
            $table->foreignId('player2_id')->nullable()->constrained('users');
            $table->foreignId('winner_id')->nullable()->constrained('users');
            $table->enum('status', ['waiting', 'in_progress', 'finished'])->default('waiting');
            $table->foreignId('current_turn')->nullable()->constrained('users');
            $table->json('player1_board')->nullable();
            $table->json('player2_board')->nullable();
            $table->json('player1_shots')->nullable();
            $table->json('player2_shots')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('games');
    }
};