<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Winner extends Model
{
    use HasFactory;

    protected $table = 'winners';

    protected $fillable = [
        'winner_id',
        'allshots',
        'asserts',
        'fails',
        'presicion',
        'boats_hints',
        'efi',
    ];
}
