import { Injectable } from '@angular/core';
import Pusher from 'pusher-js';
import { pusherConfig } from '../../src/app/app.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PusherService {
  private pusher: Pusher;

  constructor() {
    this.pusher = new Pusher(pusherConfig.key, {
      cluster: pusherConfig.cluster,
      forceTLS: true,
      auth: {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          Accept: 'application/json'
        }
      }
    });
  }

  /**
   * Método para subscribirse a un canal y evento con un gameId dinámico o sin gameId.
   * @param channelName Nombre del canal al que subscribirse.
   * @param eventName Nombre del evento al que suscribirse.
   * @param params Parámetros opcionales que se pueden pasar, como gameId.
   * @returns Observable con los datos del evento.
   */
  subscribeToChannel(channelName: string, eventName: string, params: any = {}): Observable<any> {
    return new Observable(observer => {
      let authEndpoint: string;

      // Inicializa el authEndpoint con un valor por defecto para evitar el error
      authEndpoint = `http://127.0.0.1:8000/api/default/auth`; // Puedes ajustar este valor predeterminado si lo deseas

      // Determinar dinámicamente el authEndpoint según el canal o el evento
      if (channelName.includes('game')) {
        // Si el canal es de tipo 'game', se podría verificar si es un evento de 'join' o de 'available'
        if (eventName === 'game.join') {
          // Endpoint para unirse a un juego específico
          authEndpoint = `http://127.0.0.1:8000/api/games/${params.gameId}/join`;
        } else if (eventName === 'game.created') {
          // Endpoint para ver los juegos disponibles
          authEndpoint = `http://127.0.0.1:8000/api/games`;
        }
      } else {
        // Agregar otros canales si es necesario con reglas de autenticación adicionales
        authEndpoint = `http://127.0.0.1:8000/api/${channelName}/auth`;
      }

      // Crear la instancia de Pusher con el authEndpoint dinámico
      const pusherInstance = new Pusher(pusherConfig.key, {
        cluster: pusherConfig.cluster,
        forceTLS: true,
        authEndpoint: authEndpoint,
        auth: {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            Accept: 'application/json'
          }
        }
      });

      // Suscribirse al canal
      const channel = pusherInstance.subscribe(channelName);

      // Manejar errores de suscripción
      channel.bind('pusher:subscription_error', (error: any) => {
        console.error('Error de suscripción a Pusher:', error);
        observer.error(error);
      });

      // Vincular al evento específico
      channel.bind(eventName, (data: any) => {
        observer.next(data);
      });

      // Desubscribirse cuando se desee
      return () => {
        pusherInstance.unsubscribe(channelName);
      };
    });
  }
}
