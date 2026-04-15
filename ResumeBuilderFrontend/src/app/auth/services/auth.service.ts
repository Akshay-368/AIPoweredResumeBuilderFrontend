import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'user' | 'admin';
  adminSecretKey: string | null;
}

export interface RegisterResponse {
  message: string;
}

export interface LoginRequest {
  email: string | null;
  password: string;
  phoneNumber: string | null;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
}

export interface GoogleAuthRequest {
  idToken: string;
  role?: 'user' | 'admin';
  adminSecretKey?: string | null;
}

export interface GoogleClientConfigResponse {
  clientId: string;
}

export interface LogoutResponse {
  message: string;
}

export interface ForgotPasswordOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface DeleteAccountOtpRequest {
  password: string;
}

export interface DeleteAccountConfirmRequest {
  otp: string;
}

export interface CurrentUserProfile {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  provider: string;
}

export interface UpdatePhoneNumberRequest {
  phoneNumber: string;
}

export interface UpdatePhoneNumberResponse {
  message: string;
  phoneNumber: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly baseUrl = '/api/auth';
  private readonly usersBaseUrl = '/api/users';
  private readonly accessTokenKey = 'resumeai.accessToken';
  private readonly refreshTokenKey = 'resumeai.refreshToken';

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, payload);
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap((response) => {
        this.storeTokens(response.token, response.refreshToken);
      })
    );
  }

  getGoogleClientConfig(): Observable<GoogleClientConfigResponse> {
    return this.http.get<GoogleClientConfigResponse>(`${this.baseUrl}/google/config`);
  }

  authenticateWithGoogle(payload: GoogleAuthRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/google`, payload).pipe(
      tap((response) => {
        this.storeTokens(response.token, response.refreshToken);
      })
    );
  }

  logout(email: string): Observable<LogoutResponse> {
    return this.http.post<LogoutResponse>(`${this.baseUrl}/logout`, { email }).pipe(
      tap(() => {
        this.clearTokens();
      })
    );
  }

  requestForgotPasswordOtp(payload: ForgotPasswordOtpRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password/request-otp`, payload);
  }

  verifyForgotPasswordOtp(payload: VerifyOtpRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password/verify-otp`, payload);
  }

  resetForgotPassword(payload: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password/reset`, payload);
  }

  requestDeleteAccountOtp(payload: DeleteAccountOtpRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/delete-account/request-otp`, payload);
  }

  confirmDeleteAccount(payload: DeleteAccountConfirmRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/delete-account/confirm`, payload).pipe(
      tap(() => {
        this.clearTokens();
      })
    );
  }

  getCurrentUserProfile(): Observable<CurrentUserProfile> {
    return this.http.get<CurrentUserProfile>(`${this.usersBaseUrl}/profile`);
  }

  updateCurrentUserPhoneNumber(payload: UpdatePhoneNumberRequest): Observable<UpdatePhoneNumberResponse> {
    return this.http.put<UpdatePhoneNumberResponse>(`${this.usersBaseUrl}/profile/phone-number`, payload);
  }

  storeTokens(accessToken: string, refreshToken: string): void {
    if (!this.isBrowser()) {
      return;
    }

    localStorage.setItem(this.accessTokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  clearTokens(): void {
    if (!this.isBrowser()) {
      return;
    }

    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  getAccessToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return localStorage.getItem(this.refreshTokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getCurrentUserRole(): string | null {
    const payload = this.getTokenPayload();
    if (!payload) {
      return null;
    }

    const role = payload['role'] ?? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    return typeof role === 'string' ? role : null;
  }

  isAdmin(): boolean {
    return (this.getCurrentUserRole() ?? '').toUpperCase() === 'ADMIN';
  }

  getCurrentUserId(): number | null {
    const payload = this.getTokenPayload();
    if (!payload) {
      return null;
    }

    const raw = payload['nameid']
      ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
      ?? payload['sub'];

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private getTokenPayload(): Record<string, unknown> | null {
    const token = this.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) {
        return null;
      }

      const payload = tokenParts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
      const decoded = atob(padded);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
