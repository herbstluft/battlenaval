import { Component } from '@angular/core';
import { ApiService } from '../services/api.service';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
    imports: [
      FormsModule,
      CommonModule 
  ],
})
export class RegisterComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  password_confirmation: string = '';
  successMessage: string = '';
  errorMessage: string | null = null;


  constructor(private apiService: ApiService, private router: Router) {}


  login(){
    this.router.navigate(['/login']);
  }
  onSubmit() {
    const usuario = {
      name: this.name,
      email: this.email,
      password: this.password,
      password_confirmation: this.password_confirmation
    };


    this.apiService.registerUser(usuario).subscribe(
      (response: any) => {
        this.clear();
        this.successMessage = response.message; 
      },
      (error) => {
        // Verificar si hay detalles de errores dentro de `error.error.errors`
        if (error.error && error.error.errors) {
          let errorMessages = '';
          // Recorrer cada campo y concatenar los mensajes de error
          for (let field in error.error.errors) {
            if (error.error.errors[field]) {
              errorMessages += error.error.errors[field].join(', ') + ' ';
            }
          }
          this.errorMessage = errorMessages.trim();
        } else {
          this.successMessage = '';
          // Si no existen errores específicos, mostrar el mensaje general
          this.errorMessage = error.error ? error.error.message : 'Error al registrar el usuario';
        }
      }
    );
  }

  clear(){
    this.errorMessage = '';

    this.password = '';
    this.password_confirmation = '';
  }
}
