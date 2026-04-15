import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { ProjectHistoryItem, ProjectsApiService, ResumeLibraryItem } from '../../services/projects-api.service';

@Component({
  selector: 'app-account-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-settings.page.html',
  styleUrl: './account-settings.page.css'
})
export class AccountSettingsPage implements OnInit {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly currentUserId = this.authService.getCurrentUserId();

  accountFullName = '';
  accountEmail = '';
  accountRole = '';
  accountProvider = '';
  currentPhoneNumber = '';
  newPhoneNumber = '';
  phoneMessage = '';
  isPhoneSubmitting = false;

  historyFilter: 'all' | 'active' | 'deleted' = 'all';
  history: ProjectHistoryItem[] = [];
  historyMessage = '';

  resumeLibrary: ResumeLibraryItem[] = [];
  defaultResumeId = '';
  resumeLibraryMessage = '';

  deletePassword = '';
  deleteOtp = '';
  deleteMessage = '';
  deleteOtpRequested = false;
  isDeleting = false;
  deleteOtpSecondsRemaining = 0;
  deleteOtpCountdownText = '';
  private deleteOtpCountdownIntervalId: ReturnType<typeof setInterval> | null = null;

  forgotEmail = '';
  forgotOtp = '';
  forgotNewPassword = '';
  forgotConfirmPassword = '';
  forgotMessage = '';
  forgotOtpRequested = false;
  forgotOtpVerified = false;
  forgotOtpSecondsRemaining = 0;
  forgotOtpCountdownText = '';
  private forgotOtpCountdownIntervalId: ReturnType<typeof setInterval> | null = null;

  forgotPasswordRules = {
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
    hasMinLength: false
  };
  forgotPasswordValid = false;

  async ngOnInit(): Promise<void> {
    await this.reloadData();
  }

  ngOnDestroy(): void {
    this.clearDeleteOtpCountdown();
    this.clearForgotOtpCountdown();
  }

  get filteredHistory(): ProjectHistoryItem[] {
    if (this.historyFilter === 'active') {
      return this.history.filter((item) => !item.isDeleted);
    }

    if (this.historyFilter === 'deleted') {
      return this.history.filter((item) => item.isDeleted);
    }

    return this.history;
  }

  async onFilterChange(filter: 'all' | 'active' | 'deleted'): Promise<void> {
    this.historyFilter = filter;
  }

  async restoreProject(projectId: string): Promise<void> {
    this.historyMessage = '';

    try {
      await firstValueFrom(this.projectsApi.restoreProject(projectId));
      this.historyMessage = 'Project restored successfully.';
      await this.reloadData();
      this.triggerUiUpdate();
    } catch (error: any) {
      this.historyMessage = error?.error?.message ?? 'Unable to restore project.';
      this.triggerUiUpdate();
    }
  }

  async permanentDeleteProject(projectId: string): Promise<void> {
    const confirmed = window.confirm('This action permanently removes the project and all related artifacts. Continue?');
    if (!confirmed) {
      return;
    }

    this.historyMessage = '';

    try {
      await firstValueFrom(this.projectsApi.permanentDeleteProject(projectId));
      this.historyMessage = 'Project permanently deleted.';
      await this.reloadData();
      this.triggerUiUpdate();
    } catch (error: any) {
      this.historyMessage = error?.error?.message ?? 'Unable to permanently delete project.';
      this.triggerUiUpdate();
    }
  }

  async setDefaultResume(resumeId: string): Promise<void> {
    this.resumeLibraryMessage = '';

    try {
      const response = await firstValueFrom(this.projectsApi.setDefaultResume(resumeId));
      this.defaultResumeId = response.resumeId;
      this.resumeLibraryMessage = 'Default resume updated.';
      this.triggerUiUpdate();
    } catch (error: any) {
      this.resumeLibraryMessage = error?.error?.message ?? 'Unable to set default resume.';
      this.triggerUiUpdate();
    }
  }

  async updatePhoneNumber(): Promise<void> {
    this.phoneMessage = '';

    const normalizedPhone = this.normalizePhoneNumber(this.newPhoneNumber);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      this.phoneMessage = 'Phone number must be exactly 10 digits.';
      this.triggerUiUpdate();
      return;
    }

    if (normalizedPhone === this.currentPhoneNumber) {
      this.phoneMessage = 'New phone number matches your current number.';
      this.triggerUiUpdate();
      return;
    }

    this.isPhoneSubmitting = true;
    this.triggerUiUpdate();

    try {
      const response = await firstValueFrom(this.authService.updateCurrentUserPhoneNumber({ phoneNumber: normalizedPhone }));
      this.currentPhoneNumber = response.phoneNumber;
      this.newPhoneNumber = response.phoneNumber;
      this.phoneMessage = response.message;
      this.triggerUiUpdate();
    } catch (error: any) {
      this.phoneMessage = this.mapPhoneErrorMessage(error);
      this.triggerUiUpdate();
    } finally {
      this.isPhoneSubmitting = false;
      this.triggerUiUpdate();
    }
  }

  async requestDeleteAccountOtp(): Promise<void> {
    this.deleteMessage = '';

    if (!this.deletePassword.trim()) {
      this.deleteMessage = 'Enter your password first.';
      this.triggerUiUpdate();
      return;
    }

    try {
      const response = await firstValueFrom(this.authService.requestDeleteAccountOtp({ password: this.deletePassword.trim() }));
      this.deleteMessage = response.message;
      this.deleteOtpRequested = true;
      this.startDeleteOtpCountdown(10 * 60);
      this.triggerUiUpdate();
    } catch (error: any) {
      this.deleteMessage = this.mapApiErrorMessage(error, 'Unable to request delete-account OTP.');
      this.triggerUiUpdate();
    }
  }

  async confirmDeleteAccount(): Promise<void> {
    this.deleteMessage = '';

    if (!this.deleteOtp.trim()) {
      this.deleteMessage = 'Enter OTP to confirm account deletion.';
      this.triggerUiUpdate();
      return;
    }

    if (this.deleteOtpSecondsRemaining <= 0) {
      this.deleteMessage = 'Delete-account OTP expired. Request a new OTP.';
      this.triggerUiUpdate();
      return;
    }

    const confirmed = window.confirm('This action is irreversible and will permanently remove your account and data. Continue?');
    if (!confirmed) {
      return;
    }

    this.isDeleting = true;

    try {
      const response = await firstValueFrom(this.authService.confirmDeleteAccount({ otp: this.deleteOtp.trim() }));
      this.deleteMessage = response.message;
      this.clearDeleteOtpCountdown();
      this.triggerUiUpdate();
      this.router.navigate(['/']);
    } catch (error: any) {
      this.deleteMessage = this.mapApiErrorMessage(error, 'Unable to delete account.');
      this.triggerUiUpdate();
    } finally {
      this.isDeleting = false;
      this.triggerUiUpdate();
    }
  }

  async requestForgotOtp(): Promise<void> {
    this.forgotMessage = '';

    if (!this.forgotEmail.trim()) {
      this.forgotMessage = 'Email is required.';
      this.triggerUiUpdate();
      return;
    }

    try {
      const response = await firstValueFrom(this.authService.requestForgotPasswordOtp({ email: this.forgotEmail.trim() }));
      this.forgotMessage = response.message;
      this.forgotOtpRequested = true;
      this.forgotOtpVerified = false;
      this.forgotNewPassword = '';
      this.forgotConfirmPassword = '';
      this.validateForgotPassword();
      this.startForgotOtpCountdown(10 * 60);
      this.triggerUiUpdate();
    } catch (error: any) {
      this.forgotMessage = this.mapApiErrorMessage(error, 'Unable to request password-reset OTP.');
      this.triggerUiUpdate();
    }
  }

  async verifyForgotOtp(): Promise<void> {
    this.forgotMessage = '';

    if (!this.forgotEmail.trim() || !this.forgotOtp.trim()) {
      this.forgotMessage = 'Email and OTP are required.';
      this.triggerUiUpdate();
      return;
    }

    if (this.forgotOtpSecondsRemaining <= 0) {
      this.forgotMessage = 'OTP expired. Request a new OTP.';
      this.triggerUiUpdate();
      return;
    }

    try {
      const response = await firstValueFrom(this.authService.verifyForgotPasswordOtp({
        email: this.forgotEmail.trim(),
        otp: this.forgotOtp.trim()
      }));

      this.forgotMessage = response.message;
      this.forgotOtpVerified = true;
      this.triggerUiUpdate();
    } catch (error: any) {
      this.forgotMessage = this.mapApiErrorMessage(error, 'OTP verification failed.');
      this.forgotOtpVerified = false;
      this.triggerUiUpdate();
    }
  }

  async resetForgotPassword(): Promise<void> {
    this.forgotMessage = '';

    if (!this.forgotEmail.trim() || !this.forgotOtp.trim() || !this.forgotNewPassword.trim() || !this.forgotConfirmPassword.trim()) {
      this.forgotMessage = 'Email, OTP, and new password are required.';
      this.triggerUiUpdate();
      return;
    }

    if (!this.forgotOtpVerified) {
      this.forgotMessage = 'Verify OTP before setting a new password.';
      this.triggerUiUpdate();
      return;
    }

    if (!this.forgotPasswordValid) {
      this.forgotMessage = 'New password does not satisfy required complexity.';
      this.triggerUiUpdate();
      return;
    }

    if (this.forgotNewPassword !== this.forgotConfirmPassword) {
      this.forgotMessage = 'New password and confirm password must match.';
      this.triggerUiUpdate();
      return;
    }

    try {
      const response = await firstValueFrom(this.authService.resetForgotPassword({
        email: this.forgotEmail.trim(),
        otp: this.forgotOtp.trim(),
        newPassword: this.forgotNewPassword.trim()
      }));

      this.forgotMessage = response.message;
      this.forgotOtp = '';
      this.forgotNewPassword = '';
      this.forgotConfirmPassword = '';
      this.forgotOtpRequested = false;
      this.forgotOtpVerified = false;
      this.clearForgotOtpCountdown();
      this.validateForgotPassword();
      this.triggerUiUpdate();
    } catch (error: any) {
      this.forgotMessage = this.mapApiErrorMessage(error, 'Unable to reset password.');
      this.triggerUiUpdate();
    }
  }

  validateForgotPassword(): void {
    const password = this.forgotNewPassword;
    this.forgotPasswordRules.hasUpper = /[A-Z]/.test(password);
    this.forgotPasswordRules.hasLower = /[a-z]/.test(password);
    this.forgotPasswordRules.hasNumber = /[0-9]/.test(password);
    this.forgotPasswordRules.hasSpecial = /[!@#$%^&*?]/.test(password);
    this.forgotPasswordRules.hasMinLength = password.length >= 8;
    this.forgotPasswordValid = Object.values(this.forgotPasswordRules).every((rule) => rule);
    this.triggerUiUpdate();
  }

  private startForgotOtpCountdown(seconds: number): void {
    this.clearForgotOtpCountdown();
    this.forgotOtpSecondsRemaining = seconds;
    this.forgotOtpCountdownText = this.formatSeconds(seconds);

    this.forgotOtpCountdownIntervalId = setInterval(() => {
      this.forgotOtpSecondsRemaining -= 1;

      if (this.forgotOtpSecondsRemaining <= 0) {
        this.clearForgotOtpCountdown();
        this.forgotOtpCountdownText = '00:00';
        this.forgotOtpVerified = false;
        this.forgotMessage = 'OTP expired. Request a new OTP.';
      } else {
        this.forgotOtpCountdownText = this.formatSeconds(this.forgotOtpSecondsRemaining);
      }

      this.triggerUiUpdate();
    }, 1000);
  }

  private clearForgotOtpCountdown(): void {
    if (this.forgotOtpCountdownIntervalId) {
      clearInterval(this.forgotOtpCountdownIntervalId);
      this.forgotOtpCountdownIntervalId = null;
    }

    this.forgotOtpSecondsRemaining = 0;
    this.forgotOtpCountdownText = '';
  }

  private startDeleteOtpCountdown(seconds: number): void {
    this.clearDeleteOtpCountdown();
    this.deleteOtpSecondsRemaining = seconds;
    this.deleteOtpCountdownText = this.formatSeconds(seconds);

    this.deleteOtpCountdownIntervalId = setInterval(() => {
      this.deleteOtpSecondsRemaining -= 1;

      if (this.deleteOtpSecondsRemaining <= 0) {
        this.clearDeleteOtpCountdown();
        this.deleteOtpCountdownText = '00:00';
        this.deleteMessage = 'Delete-account OTP expired. Request a new OTP.';
      } else {
        this.deleteOtpCountdownText = this.formatSeconds(this.deleteOtpSecondsRemaining);
      }

      this.triggerUiUpdate();
    }, 1000);
  }

  private clearDeleteOtpCountdown(): void {
    if (this.deleteOtpCountdownIntervalId) {
      clearInterval(this.deleteOtpCountdownIntervalId);
      this.deleteOtpCountdownIntervalId = null;
    }

    this.deleteOtpSecondsRemaining = 0;
    this.deleteOtpCountdownText = '';
  }

  private formatSeconds(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private mapApiErrorMessage(error: any, fallback: string): string {
    if (error?.status === 429) {
      return 'Too many requests, try again later.';
    }

    return error?.error?.message ?? fallback;
  }

  private mapPhoneErrorMessage(error: any): string {
    if (error?.status === 409) {
      return 'An account with this phone number already exists. Use another number.';
    }

    if (error?.status === 400) {
      return error?.error?.message ?? 'Phone number must be exactly 10 digits.';
    }

    if (error?.status === 429) {
      return 'Too many requests, try again later.';
    }

    return error?.error?.message ?? 'Unable to update phone number right now.';
  }

  private normalizePhoneNumber(value: string): string {
    return value.replace(/\D/g, '').trim();
  }

  private async reloadData(): Promise<void> {
    try {
      const profile = await firstValueFrom(this.authService.getCurrentUserProfile());
      this.accountFullName = profile.fullName;
      this.accountEmail = profile.email;
      this.accountRole = profile.role;
      this.accountProvider = profile.provider;
      this.currentPhoneNumber = this.normalizePhoneNumber(profile.phoneNumber);
      this.newPhoneNumber = this.currentPhoneNumber;
      this.phoneMessage = '';
      this.triggerUiUpdate();
    } catch {
      this.phoneMessage = 'Unable to load your account profile.';
      this.triggerUiUpdate();
    }

    try {
      this.history = await firstValueFrom(this.projectsApi.getProjectHistory(true));
      this.triggerUiUpdate();
    } catch {
      this.history = [];
      this.historyMessage = 'Unable to load project history.';
      this.triggerUiUpdate();
    }

    try {
      const libraryResponse = await firstValueFrom(this.projectsApi.getResumeLibrary());
      this.resumeLibrary = libraryResponse.items;
      this.defaultResumeId = libraryResponse.defaultResume?.resumeId ?? '';
      this.triggerUiUpdate();
    } catch {
      this.resumeLibrary = [];
      this.resumeLibraryMessage = 'Unable to load resume library.';
      this.triggerUiUpdate();
    }
  }

  private triggerUiUpdate(): void {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
