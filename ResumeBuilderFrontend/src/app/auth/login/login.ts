import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, throwError, timeout } from 'rxjs';
import { AuthService } from '../services/auth.service';

declare const google: any;



@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  standalone: true
})
export class Login implements AfterViewInit {
  @ViewChild('googleLoginButtonHost') googleLoginButtonHost?: ElementRef<HTMLDivElement>;
  @Output() forgotPasswordFlowActiveChange = new EventEmitter<boolean>();
  @Output() forgotPasswordFlowCompleted = new EventEmitter<void>();

  constructor(private router: Router, private authService: AuthService , private cdr : ChangeDetectorRef) {} // injecting router to navigate to dashboard on successful login
  email : string = '' ;
  password : string = '' ;
  phone : string = '' ;
  loginMethod : 'email' | 'phone' = 'email'; // by default, login method is set to email
  isSubmitting: boolean = false;
  emailErrorMessage: string = '';
  phoneErrorMessage: string = '';
  forgotEmail: string = '';
  forgotOtp: string = '';
  forgotNewPassword: string = '';
  forgotConfirmPassword: string = '';
  forgotMessage: string = '';
  forgotNewPasswordError: string = '';
  forgotOtpRequested: boolean = false;
  forgotOtpVerified: boolean = false;
  isForgotPasswordPanelOpen = false;
  otpSecondsRemaining = 0;
  otpCountdownText = '';
  private otpCountdownIntervalId: ReturnType<typeof setInterval> | null = null;
  isGoogleSubmitting = false;

  forgotPasswordRules = {
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
    hasMinLength: false
  };
  forgotPasswordValid = false;

  ngOnDestroy(): void {
    this.clearOtpCountdown();
  }

  ngAfterViewInit(): void {
    this.initializeGoogleButton();
  }

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

  requestForgotPasswordOtp(): void {
    this.forgotMessage = '';

    if (!this.forgotEmail.trim()) {
      this.forgotMessage = 'Enter your account email first.';
      this.cdr.detectChanges();
      return;
    }

    this.authService.requestForgotPasswordOtp({ email: this.forgotEmail.trim() }).subscribe({
      next: (response) => {
        this.forgotOtp = '';
        this.forgotOtpVerified = false;
        this.forgotOtpRequested = true;
        this.forgotNewPassword = '';
        this.forgotConfirmPassword = '';
        this.forgotNewPasswordError = '';
        this.validateForgotPassword();
        this.forgotOtpRequested = true;
        this.forgotMessage = response.message;
        this.startOtpCountdown(10 * 60);
        this.cdr.detectChanges();
      },
      error: (errorResponse) => {
        this.forgotMessage = this.mapForgotPasswordError(errorResponse);
        this.cdr.detectChanges();
      }
    });
  }

  verifyForgotPasswordOtp(): void {
    this.forgotMessage = '';

    if (!this.forgotEmail.trim() || !this.forgotOtp.trim()) {
      this.forgotMessage = 'Email and OTP are required.';
      this.cdr.detectChanges();
      return;
    }

    if (this.otpSecondsRemaining <= 0) {
      this.forgotMessage = 'OTP has expired. Request a new OTP.';
      this.cdr.detectChanges();
      return;
    }

    this.authService.verifyForgotPasswordOtp({
      email: this.forgotEmail.trim(),
      otp: this.forgotOtp.trim()
    }).subscribe({
      next: (response) => {
        this.forgotOtpVerified = true;
        this.forgotMessage = response.message;
        this.cdr.detectChanges();
      },
      error: (errorResponse) => {
        this.forgotOtpVerified = false;
        this.forgotMessage = this.mapForgotPasswordError(errorResponse);
        this.cdr.detectChanges();
      }
    });
  }

  resetForgotPassword(): void {
    this.forgotMessage = '';
    this.forgotNewPasswordError = '';

    if (!this.forgotEmail.trim() || !this.forgotOtp.trim() || !this.forgotNewPassword.trim() || !this.forgotConfirmPassword.trim()) {
      this.forgotMessage = 'Email, OTP, and new password are required.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.forgotOtpVerified) {
      this.forgotMessage = 'Verify OTP before setting a new password.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.forgotPasswordValid) {
      this.forgotMessage = 'New password does not satisfy required complexity.';
      this.cdr.detectChanges();
      return;
    }

    if (this.forgotNewPassword !== this.forgotConfirmPassword) {
      this.forgotMessage = 'New password and confirm password must match.';
      this.cdr.detectChanges();
      return;
    }

    this.authService.resetForgotPassword({
      email: this.forgotEmail.trim(),
      otp: this.forgotOtp.trim(),
      newPassword: this.forgotNewPassword.trim()
    }).subscribe({
      next: (response) => {
        this.forgotMessage = response.message + ' Redirecting to login...';
        this.closeForgotPasswordPanel(true);
        this.cdr.detectChanges();
      },
      error: (errorResponse) => {
        const mapped = this.mapForgotPasswordError(errorResponse);
        this.forgotMessage = mapped;
        if (mapped.toLowerCase().includes('old password and new password can\'t be same')) {
          this.forgotNewPasswordError = mapped;
        }
        this.cdr.detectChanges();
      }
    });
  }

  openForgotPasswordPanel(): void {
    this.isForgotPasswordPanelOpen = true;
    this.forgotPasswordFlowActiveChange.emit(true);
    this.forgotMessage = '';
    this.cdr.detectChanges();
  }

  closeForgotPasswordPanel(completed = false): void {
    this.isForgotPasswordPanelOpen = false;
    this.forgotOtpRequested = false;
    this.forgotOtpVerified = false;
    this.forgotEmail = '';
    this.forgotOtp = '';
    this.forgotNewPassword = '';
    this.forgotConfirmPassword = '';
    this.forgotMessage = '';
    this.forgotNewPasswordError = '';
    this.validateForgotPassword();
    this.clearOtpCountdown();
    this.forgotPasswordFlowActiveChange.emit(false);

    if (completed) {
      this.forgotPasswordFlowCompleted.emit();
    }

    this.cdr.detectChanges();
  }

  validateForgotPassword(): void {
    const password = this.forgotNewPassword;
    this.forgotNewPasswordError = '';
    this.forgotPasswordRules.hasUpper = /[A-Z]/.test(password);
    this.forgotPasswordRules.hasLower = /[a-z]/.test(password);
    this.forgotPasswordRules.hasNumber = /[0-9]/.test(password);
    this.forgotPasswordRules.hasSpecial = /[!@#$%^&*?]/.test(password);
    this.forgotPasswordRules.hasMinLength = password.length >= 8;
    this.forgotPasswordValid = Object.values(this.forgotPasswordRules).every((rule) => rule);
  }

  passwordsMatchForReset(): boolean {
    if (!this.forgotConfirmPassword) {
      return false;
    }

    return this.forgotNewPassword === this.forgotConfirmPassword;
  }

  private startOtpCountdown(seconds: number): void {
    this.clearOtpCountdown();
    this.otpSecondsRemaining = seconds;
    this.otpCountdownText = this.formatSeconds(seconds);

    this.otpCountdownIntervalId = setInterval(() => {
      this.otpSecondsRemaining -= 1;

      if (this.otpSecondsRemaining <= 0) {
        this.clearOtpCountdown();
        this.otpCountdownText = '00:00';
        this.forgotOtpVerified = false;
        this.forgotMessage = 'OTP expired. Request a new OTP.';
      } else {
        this.otpCountdownText = this.formatSeconds(this.otpSecondsRemaining);
      }

      this.cdr.detectChanges();
    }, 1000);
  }

  private clearOtpCountdown(): void {
    if (this.otpCountdownIntervalId) {
      clearInterval(this.otpCountdownIntervalId);
      this.otpCountdownIntervalId = null;
    }

    this.otpSecondsRemaining = 0;
    this.otpCountdownText = '';
  }

  private formatSeconds(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private mapForgotPasswordError(errorResponse: any): string {
    if (errorResponse?.status === 429) {
      return 'Too many requests, try again later.';
    }

    return errorResponse?.error?.message ?? 'Unable to complete forgot-password flow right now.';
  }

  private initializeGoogleButton(): void {
    const hostElement = this.googleLoginButtonHost?.nativeElement;
    if (!hostElement || typeof google === 'undefined' || !google.accounts?.id) {
      return;
    }

    this.authService.getGoogleClientConfig().subscribe({
      next: (config) => {
        google.accounts.id.initialize({
          client_id: config.clientId,
          callback: (response: { credential?: string }) => {
            const idToken = response?.credential;
            if (!idToken) {
              this.emailErrorMessage = 'Google sign-in failed: missing credential token.';
              this.cdr.detectChanges();
              return;
            }

            this.isGoogleSubmitting = true;
            this.emailErrorMessage = '';
            this.phoneErrorMessage = '';
            this.cdr.detectChanges();

            this.authService.authenticateWithGoogle({ idToken }).subscribe({
              next: () => {
                this.isGoogleSubmitting = false;
                this.router.navigate(['/dashboard']);
              },
              error: (errorResponse) => {
                this.isGoogleSubmitting = false;
                this.emailErrorMessage = this.getLoginErrorMessage(errorResponse);
                this.cdr.detectChanges();
              }
            });
          }
        });

        google.accounts.id.renderButton(hostElement, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: 280,
          shape: 'rectangular'
        });
      },
      error: () => {
        this.emailErrorMessage = 'Google login is not configured on server.';
        this.cdr.detectChanges();
      }
    });
  }

}
