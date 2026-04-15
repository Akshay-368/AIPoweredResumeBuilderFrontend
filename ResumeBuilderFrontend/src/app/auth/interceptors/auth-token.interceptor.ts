import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Public auth endpoints do not need bearer token from interceptor.
  const publicAuthRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/google',
    '/api/auth/google/config',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/forgot-password/request-otp',
    '/api/auth/forgot-password/verify-otp',
    '/api/auth/forgot-password/reset'
  ];

  if (publicAuthRoutes.some((route) => req.url.startsWith(route))) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  if (!token) {
    return next(req);
  }

  const authRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authRequest);
};
