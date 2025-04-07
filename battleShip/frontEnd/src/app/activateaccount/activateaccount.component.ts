import { Component } from '@angular/core';
import { ApiService } from '../services/api.service'; 
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';



@Component({
  selector: 'app-activateaccount',
  templateUrl: './activateaccount.component.html',
  styleUrls: ['./activateaccount.component.css'],
  imports: [
    FormsModule,
    CommonModule 
  ],
})
export class ActivateaccountComponent {
  verificationCode: string = ''; 
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private apiService: ApiService, private router: Router) {}

  onSubmit() {
    this.apiService.verifyCode(this.verificationCode).subscribe(
      (response) => {

        this.successMessage = 'Cuenta Activada. Inicia sesión.';


        if(response.message){
            setTimeout(() => {
              this.router.navigate([response.redirectUrl]);
            }, 3000);
          }
      },
      (error) => {
        this.successMessage = '';
        this.errorMessage = error.error.message;
      }
    );
  }
}
