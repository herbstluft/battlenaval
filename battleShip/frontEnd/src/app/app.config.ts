import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';  // ✅ Importar provideHttpClient
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),  // ✅ Agregar provideHttpClient aquí
  ],
};

// ✅ Configuración de Pusher
export const pusherConfig = {
  key: '828e7820f2caa513ef5d',
  cluster: 'us2',
};
