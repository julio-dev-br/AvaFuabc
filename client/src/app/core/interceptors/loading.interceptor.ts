import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LayoutService } from '../services/layout.service';
import { finalize } from 'rxjs';

let requisicoesAtivas = 0;

const ROTAS_SILENCIOSAS = [
  '/notificacoes',
  '/notifications',
  '/telemetria',
  '/progresso',
  '/estatisticas',
  '/chat'
];

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const layoutService = inject(LayoutService);

  const ignorarLoader =
    req.headers.has('X-Skip-Loader') ||
    ROTAS_SILENCIOSAS.some((rota) => req.url.toLowerCase().includes(rota));

  if (ignorarLoader) {
    const reqLimpa = req.headers.has('X-Skip-Loader')
      ? req.clone({ headers: req.headers.delete('X-Skip-Loader') })
      : req;
    return next(reqLimpa);
  }

  if (requisicoesAtivas === 0) {
    setTimeout(() => {
      if (requisicoesAtivas > 0) layoutService.showLoader();
    }, 120);
  }

  requisicoesAtivas++;

  return next(req).pipe(
    finalize(() => {
      requisicoesAtivas--;
      if (requisicoesAtivas <= 0) {
        requisicoesAtivas = 0;
        layoutService.hideLoader();
      }
    })
  );
};
