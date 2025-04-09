<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\ActivationMail;

//modelos
use App\Models\User;


class UserController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);


        $validteUser = User::where('email', $request->email)->first();
        if($validteUser->is_active == 1){
            if (Auth::attempt($validated, true)) {
                $user = Auth::user();
                $token = $user->createToken('auth-token')->plainTextToken;
        
                return response()->json([
                    'message' => 'Iniciando Sesión...',
                    'redirectUrl' => $user->role == 'admin' ? '/panel' : '/dashboard',
                    'token' => $token
                ])->withCookie(cookie('XSRF-TOKEN', csrf_token(), 60, null, null, true, true));
            }  
            
            return response()->json(['message' => 'Credenciales incorrectas.'], 401);

        }
        else{
            return response()->json([
               'message' => 'Este usuario no está activado.',
            ], 422);
        }
    
    
    }
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255',
            'password' => 'required|string|min:8|confirmed',
        ]);


        try {
            $existingUser = User::where('email', $request->email)->first();
            $activationCode = rand(100000, 999999);

            if ($existingUser) {
                if ($existingUser->is_active) {
                    return response()->json([
                        'message' => 'Este correo ya está registrado y activado.',
                    ], 422);
                }

                $existingUser->update([
                    'activation_code' => $activationCode
                ]);

                $signedUrl = URL::signedRoute('verify.account');
                Mail::to($existingUser->email)->send(new ActivationMail($existingUser, $signedUrl));

                return response()->json([
                    'message' => 'Nuevo código de activación enviado.',
                    'redirectUrl' => '/activateAccount',
                ], 200);
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => bcrypt($request->password),
                'activation_code' => $activationCode,
                'is_active' => null
            ]);

            $signedUrl = URL::signedRoute('verify.account');
            Mail::to($user->email)->send(new ActivationMail($user, $signedUrl));

            return response()->json([
                'message' => 'Correo de activación enviado con éxito.',
                'redirectUrl' => '/activateAccount',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al procesar el registro.',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function showVerifyPage(Request $request)
    {
        if (!$request->hasValidSignature()) {
            abort(403);
        }
    
        $angularUrl = env('APP_URL_ANGULAR');
    
        return redirect()->away($angularUrl . '/activateAccount');
    }

    public function verifyCode(Request $request)
    {
        $code = $request->code ?? null;

        $userData = User::select(['*'])
        ->where(User::TABLE.'.'.User::ACTIVATION_CODE, $code) 
        ->first();
        
        if (!$userData) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        $codeDB = $userData->activation_code;

        if ($code == $codeDB) {

            $userData->is_active = 1;
            $userData->save();

            return response()->json(['message' => 'Código de activación válido.', 'redirectUrl' => '/login'], 200);
        } else {
            return response()->json(['error' => 'Código de activación inválido.'], 400);
        }
    }
}
