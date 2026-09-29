import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LayoutService } from '../services/layout.service';
import { finalize, delay } from 'rxjs';

let requisicoesAtivas = 0;

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
    const layoutService = inject(LayoutService);
    if (requisicoesAtivas === 0) {
        setTimeout(() => {
            if (requisicoesAtivas > 0) layoutService.showLoader();
        });
    }

    requisicoesAtivas++;

    return next(req).pipe(
        // delay(1500),
        finalize(() => {
            requisicoesAtivas--;
            if (requisicoesAtivas === 0) {
                layoutService.hideLoader();
            }
        })
    );
};
