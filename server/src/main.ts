import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

if (typeof BigInt !== 'undefined') {
  (BigInt.prototype as any).toJSON = function (): string {
    return this.toString();
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const porta = process.env.PORT || 3000;

  app.enableCors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('AVA Fundação ABC - API Portal Executivo')
    .setDescription('Catálogo de endpoints de engenharia de dados do AVA (Treinamentos, Kanban e Dashboard)')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();
  const document = SwaggerModule.createDocument(app, config);
  
  SwaggerModule.setup('api/docs', app, document);
  
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  await app.listen(porta);
  console.log(`SERVIDOR DA FUNDAÇÃO ABC ONLINE NA PORTA: ${porta}`);
  console.log(`DOCUMENTAÇÃO SWAGGER DISPONÍVEL EM: http://localhost:${porta}/api/docs`);
}
bootstrap();
