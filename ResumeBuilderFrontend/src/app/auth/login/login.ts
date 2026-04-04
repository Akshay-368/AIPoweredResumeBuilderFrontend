import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';



@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  standalone: true
})
export class Login {
  constructor(private router: Router) {} // injecting router to navigate to dashboard on successful login
  email : string = '' ;
  password : string = '' ;
  phone : string = '' ;
  loginMethod : 'email' | 'phone' = 'email'; // by default, login method is set to email

  // method to verify if the login method is email or phone and validate the input accordingly
  isValidLogin() : boolean{
    if (this.loginMethod === 'email') {
      if (this.email === '' || this.password === '') {
        return false; // returns false if either email or password is null
      }
      // Regular expression to validate email format
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailPattern.test(this.email); // returns true if email format is valid, otherwise false
    } else if (this.loginMethod==='phone') {
      if (this.phone === '' || this.password === '') {
        return false; // returns false if either phone or password is null
      }
      // Regular expression to validate phone number format (10 digits)
      const phonePattern = /^\d{10}$/;
      return phonePattern.test(this.phone); // returns true if phone format is valid, otherwise false
    }
    return false ; // returns false if either email or phone is null
  }

  onLogin() {
    if ( !this.isValidLogin()) return ;
    console.log('Login successful!'); // logs a message to the console on successful login
    // routing to dashboard on successful login
    this.router.navigate(['/dashboard']);
  }

}
