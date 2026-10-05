import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const token = localStorage.getItem('accessToken');
    if (token) {
        return true;
    }
    console.warn('⚠️ Acesso negado! Redirecionando para a tela de login corporativo.');
    router.navigate(['/login']);
    return false;
};
