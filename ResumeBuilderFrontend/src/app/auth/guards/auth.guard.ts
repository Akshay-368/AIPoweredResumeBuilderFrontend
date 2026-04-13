import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

function handleAuthCheck(): boolean | UrlTree {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/']);
}

export const authGuard: CanActivateFn = () => {
  return handleAuthCheck();
};

export const authChildGuard: CanActivateChildFn = () => {
  return handleAuthCheck();
};
