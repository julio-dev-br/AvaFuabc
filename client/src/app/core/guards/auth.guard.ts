import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);

    // Captura o crachá de segurança na memória do navegador
    const token = localStorage.getItem('accessToken');

    // CASO POSSITIVO: Se o token existir, libera a passagem de braços abertos
    if (token) {
        return true;
    }

    // CASO NEGATIVO: Se estiver vazio (deslogado), barra a navegação e chuta para o login
    console.warn('⚠️ Acesso negado! Redirecionando para a tela de login corporativo.');
    router.navigate(['/login']);
    return false;
};
