import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../services/auth.service';
@Component({
  selector: 'app-register',
  imports: [FormsModule , CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
  standalone: true
})
export class Register {
  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  fullName : string = '';
  email : string = '';
  phoneNumber : string = '';
  password : string = '' ;
  confirmPassword : string = '' ;
  adminSecretKey : string = '';
  selectedRole : 'user' | 'admin' = 'user' ;
  hasFocusedConfirmPassword : boolean = false;
  showPasswordMatchStatus : boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // For real-time password validation feedback. This object can be used to track which password rules are satisfied and provide dynamic feedback in the UI.
  passwordRules = { hasUpper : false, hasLower : false , hasNumber : false , hasSpecial : false , hasMinLength : false };
  passwordValid : boolean = false;
  validatePassword() : void {
    const password = this.password;
    this.passwordRules.hasUpper =  /[A-Z]/.test(password);
    this.passwordRules.hasLower = /[a-z]/.test(password);
    this.passwordRules.hasNumber = /[0-9]/.test(password);
    this.passwordRules.hasSpecial = /[!@#$%^&*?]/.test(password);
    this.passwordRules.hasMinLength = password.length >= 8 ;

    this.passwordValid = Object.values(this.passwordRules).every(rule => rule);
   }


  @Output() registerSuccess = new EventEmitter<void>();
  private confirmPasswordDebounceTimer : ReturnType<typeof setTimeout> | null = null;

  // Marks first interaction so validation feedback does not appear on initial page load.
  onConfirmPasswordFocus(): void {
    this.hasFocusedConfirmPassword = true;
  }

  // Waits 3 seconds after user stops typing before showing match status.
  onConfirmPasswordChange(): void {
    if (!this.hasFocusedConfirmPassword) {
      return;
    }

    this.showPasswordMatchStatus = false;

    if (this.confirmPasswordDebounceTimer !== null) {
      clearTimeout(this.confirmPasswordDebounceTimer);
    }

    this.confirmPasswordDebounceTimer = setTimeout(() => {
      this.showPasswordMatchStatus = this.confirmPassword.length > 0;
    }, 3000);
  }

  checkPasswordMatch() : boolean{
    if (this.password === '' || this.confirmPassword === '') {
      return false; // returns false if either password or confirm password is null
    }
    return this.password === this.confirmPassword && this.confirmPassword != ''; // returns true if both password and confirm password are same, otherwise false
  }

  onRegister(registerForm: NgForm) : void {
    if (!registerForm.valid || !this.checkPasswordMatch()) {
      // Keep invalid submits blocked even if submit is triggered manually.
      return;
    }

    const registrationPayload = {
      fullName: this.fullName,
      email: this.email,
      phoneNumber: this.phoneNumber,
      password: this.password,
      role: this.selectedRole,
      adminSecretKey: this.selectedRole === 'admin' ? this.adminSecretKey : null
    };

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.register(registrationPayload)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.successMessage = response.message ?? 'Registration successful. You can now sign in.';
          this.errorMessage = '';
          registerForm.resetForm({ selectedRole: 'user' });
          this.selectedRole = 'user';
          this.passwordRules = { hasUpper : false, hasLower : false , hasNumber : false , hasSpecial : false , hasMinLength : false };
          this.passwordValid = false;
          this.cdr.detectChanges();
          // switch back to login tab after successful registration. The event is handled by parent auth component to toggle the view.
          this.registerSuccess.emit();
        },
        error: (error) => {
          this.successMessage = '';
          this.errorMessage = this.mapRegistrationErrorMessage(error);
          this.cdr.detectChanges();
        }
      });
  }

  private mapRegistrationErrorMessage(error: any): string {
    const backendMessage = typeof error?.error === 'string'
      ? error.error
      : typeof error?.error?.message === 'string'
        ? error.error.message
        : '';

    const fallbackMessage = typeof error?.message === 'string'
      ? error.message
      : '';

    const rawMessage = (backendMessage || fallbackMessage).trim();
    const normalizedMessage = rawMessage.toLowerCase();
    const status = Number(error?.status ?? 0);

    if (status === 0) {
      return 'Unable to reach server. Check your connection and try again.';
    }

    if (
      normalizedMessage.includes('already exists') ||
      normalizedMessage.includes('email or phone number already exists') ||
      status === 409
    ) {
      return 'An account with this email or phone number already exists. Please sign in instead.';
    }

    if (normalizedMessage.includes('admin key is required')) {
      return 'Admin key is required when registering as admin.';
    }

    if (
      normalizedMessage.includes('invalid admin key') ||
      normalizedMessage.includes('wrong admin key')
    ) {
      return 'Invalid admin key. Please verify the key and try again.';
    }

    if (normalizedMessage.includes('role must be either')) {
      return 'Invalid role selected. Please choose either User or Admin.';
    }

    if (status === 400 && rawMessage) {
      return rawMessage;
    }

    if (status === 500) {
      return 'Server error while creating your account. Please try again in a moment.';
    }

    if (rawMessage) {
      return rawMessage;
    }

    return 'Registration failed. Please try again.';
  }
}
