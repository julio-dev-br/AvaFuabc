import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import type { SignInDTO, SignUpDTO } from './dtos/auth';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';

import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService, private readonly prisma: PrismaService) { }

    @Post('signup')
    async signup(@Body() body: SignUpDTO) {
        return await this.authService.signup(body);
    }

    @Post('signin')
    async signin(@Body() body: SignInDTO) {
        return this.authService.signin(body);
    }

    @UseGuards(AuthGuard)
    @Get('me')
    async me(@CurrentUser() user: any) {
        return this.prisma.user.findUnique({
            where: { id: Number(user.id) },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar_url: true
            }
        });
    }

}
