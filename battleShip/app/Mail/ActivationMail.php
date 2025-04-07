<?php
namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

class ActivationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $signedUrl;

    /**
     * Crear una nueva instancia del mensaje.
     *
     * @param \App\Models\User $user
     * @param string $signedUrl
     */
    public function __construct(User $user, $signedUrl)
    {
        $this->user = $user;
        $this->signedUrl = $signedUrl;
    }

    /**
     * Construir el mensaje.
     *
     * @return $this
     */
    public function build()
    {
        $signedUrl = URL::temporarySignedRoute(
            'verify.account',
            now()->addMinutes(1), 
            ['code' => $this->user->activation_code]
        );
    
        return $this->subject('Activación de cuenta - Batalla Naval')
            ->html('
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; border-radius: 15px; max-width: 600px; margin: 0 auto; text-align: center;">
                <div style="background: rgba(255, 255, 255, 0.9); border-radius: 15px; padding: 40px; backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                    <h1 style="font-size: 24px; color: #333; margin-bottom: 20px; font-weight: 600;">¡Hola ' . $this->user->name . '!</h1>
                    <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Gracias por registrarte en nuestra plataforma. Para completar el proceso de activación de tu cuenta, haz clic en el siguiente botón:</p>
                    <a href="' . $signedUrl . '" style="display: inline-block; background-color: #007aff; color: white; padding: 15px 30px; font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 50px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); transition: all 0.3s ease;">
                        Activar Cuenta
                    </a>
                    <p style="font-size: 18px; color: #333; margin-top: 20px; margin-bottom: 20px;">Tu código de activación es: <strong>' . $this->user->activation_code . '</strong></p>
                    <p style="font-size: 16px; color: #555; margin-top: 20px;">Si no solicitaste la activación, por favor ignora este mensaje.</p>
                </div>
            </div>
            ');
    }
}

