import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
@Component({
  selector: 'app-register',
  imports: [FormsModule , CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
  standalone: true
})
export class Register {
  fullName : string = '';
  email : string = '';
  phoneNumber : string = '';
  password : string = '' ;
  confirmPassword : string = '' ;
  adminSecretKey : string = '';
  selectedRole : 'user' | 'admin' = 'user' ;
  hasFocusedConfirmPassword : boolean = false;
  showPasswordMatchStatus : boolean = false;

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

    console.log('Registration payload (frontend validation passed):', registrationPayload);

    // TODO: enable this while integrating backend API.
    // this.http.post('/api/register', registrationPayload).subscribe();

    // Switch back to login tab after successful validated registration.
    this.registerSuccess.emit();
  }
}
