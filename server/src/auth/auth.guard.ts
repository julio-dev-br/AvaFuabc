import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class AuthGuard implements CanActivate {
    // Injetamos o ConfigService para ler o .env de forma segura
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('Access token not found');
        }

        try {
            // Buscamos o JWT_SECRET do arquivo .env
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>('JWT_SECRET'),
            });

            request['user'] = payload;
        } catch {
            throw new UnauthorizedException('Invalid access token');
        }

        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        // Buscamos do cabeçalho de autorização
        const authHeader = request.headers.authorization;
        if (!authHeader) return undefined;

        const [type, token] = authHeader.split(' ');
        // Corrigido: Verificamos se o tipo é Bearer e retornamos o TOKEN
        return type === 'Bearer' ? token : undefined;
    }
}
