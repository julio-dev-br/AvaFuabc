import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { ValidationPipe } from '@nestjs/common';

// 🌟 VACINA DE RUNTIME: Aplica com checagem de segurança para evitar Crash no Linux
if (typeof BigInt !== 'undefined' && !BigInt.prototype.hasOwnProperty('toJSON')) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // No seu server/src/main.ts
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  const porta = process.env.PORT || 3000;


  app.enableCors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  await app.listen(porta);
  console.log(`🚀 SERVIDOR DA FUNDAÇÃO ABC RODANDO NA PORTA: ${porta}`);
}
bootstrap();
