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

export interface LogoutResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly baseUrl = '/api/auth';
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

  logout(email: string): Observable<LogoutResponse> {
    return this.http.post<LogoutResponse>(`${this.baseUrl}/logout`, { email }).pipe(
      tap(() => {
        this.clearTokens();
      })
    );
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

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
