import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, throwError, timeout } from 'rxjs';
import { AuthService } from '../services/auth.service';



@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  standalone: true
})
export class Login {
  constructor(private router: Router, private authService: AuthService , private cdr : ChangeDetectorRef) {} // injecting router to navigate to dashboard on successful login
  email : string = '' ;
  password : string = '' ;
  phone : string = '' ;
  loginMethod : 'email' | 'phone' = 'email'; // by default, login method is set to email
  isSubmitting: boolean = false;
  emailErrorMessage: string = '';
  phoneErrorMessage: string = '';

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
      const normalizedPhone = this.normalizePhoneNumber(this.phone);

      if (normalizedPhone === '' || this.password === '') {
        return false; // returns false if either phone or password is null
      }

      // Accept formatted phone input, but only submit when it resolves to exactly 10 digits.
      return /^\d{10}$/.test(normalizedPhone);
    }
    return false ; // returns false if either email or phone is null
  }

  onLogin() {
    if ( !this.isValidLogin()) return ;

    const attemptedMethod = this.loginMethod;

    const normalizedPhone = this.normalizePhoneNumber(this.phone);

    const loginPayload = {
      email: this.loginMethod === 'email' ? this.email : null,
      phoneNumber: this.loginMethod === 'phone' ? normalizedPhone : null,
      password: this.password
    };

    this.isSubmitting = true;
    this.emailErrorMessage = '';
    this.phoneErrorMessage = '';

    this.authService.login(loginPayload)
      .pipe(
        timeout(15000),
        catchError((error) => {
          const message = this.getLoginErrorMessage(error);

          if (attemptedMethod === 'email') {
            this.emailErrorMessage = message;
          } else {
            this.phoneErrorMessage = message;
          }

          // Manually trigger change detection to update the view with error messages.
          this.cdr.detectChanges(); // here , so that we can set error message before view update.
          // using detectChanges here instead of markForCheck , because it immediately runs change detection and forces ui update NOW
          // while markForCheck only marks component as dirty and waits for next detection cycle to update the view, which may cause delay in showing error message and also may not work if component is OnPush and no other change detection triggers happen after that.

          return throwError(() => error);
        }),
        finalize(() => {
          this.isSubmitting = false;
          // This one to reset loading spinner state, and allow user to attempt login again, whether the previous attempt succeeded or failed.
          this.cdr.detectChanges(); // Ensure view updates after login attempt completes, whether successful or not.
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          // Error message already set in catchError.
          this.cdr.detectChanges(); // just a fallback safety.
        }
      });
  }

  setLoginMethod(method: 'email' | 'phone'): void {
    this.loginMethod = method;
  }

  normalizePhoneNumber(value: string): string {
    return value.replace(/\D/g, '').trim();
  }

  private getLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Wrong credentials, please check your credentials.';
      }

      if (error.status === 0) {
        return 'Unable to reach the server. Please try again.';
      }

      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        return error.error;
      }

      if (error.error?.message) {
        return error.error.message;
      }
    }

    return 'Login failed. Please try again.';
  }

}
