import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const RecuperacionTokenGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const token = route.queryParamMap.get('token');

  if (!token?.trim()) {
    return router.createUrlTree(['/recuperar-cuenta']);
  }

  return true;
};
