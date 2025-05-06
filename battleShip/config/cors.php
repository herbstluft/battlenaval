<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'broadcasting/*', '*',  'login', 'logout', 'csrf-token', 'sanctum/csrf-cookie'], // Permitir cualquier ruta en api y broadcasting
    'allowed_methods' => ['*'], // Permitir todos los métodos HTTP (GET, POST, PUT, DELETE, etc.)
    'allowed_origins' => [
        'http://localhost:4200',
        'http://192.168.1.8:4200'  // Add your network IP here
    ], // Permitir solicitudes desde tu frontend (Angular)
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'], // Permitir cualquier cabecera
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,

];

