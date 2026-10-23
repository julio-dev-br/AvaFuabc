import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridas = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);


    if (!requeridas) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user || !requeridas.includes(user.role)) {
      throw new ForbiddenException('Acesso restrito: você não tem permissão para acessar este recurso.');
    }

    return true;
  }
}
