import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // 🌟 1. IMPORTA O MOTOR DO SWAGGER

// Serializa BigInt/Postgres para Number com total segurança
if (typeof BigInt !== 'undefined' && !BigInt.prototype.hasOwnProperty('toJSON')) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Filtros Globais de Validação de DTOs e payloads HTTP
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const porta = process.env.PORT || 3000;

  // Configurações de CORS do ecossistema front-end Angular
  app.enableCors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // CONFIGURAÇÃO DA DOCUMENTAÇÃO SWAGGER 
  const config = new DocumentBuilder()
    .setTitle('AVA Fundação ABC - API Portal Executivo')
    .setDescription('Catálogo de endpoints de engenharia de dados do AVA (Treinamentos, Kanban e BI)')
    .setVersion('1.0')
    .addBearerAuth() // Adiciona o campo de cadeado para podermos colar o Token JWT nos testes!
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Define que a rota para acessar a documentação na web será '/api/docs'
  SwaggerModule.setup('api/docs', app, document);

  // Repositório físico de arquivos de imagem e materiais de apoio
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  await app.listen(porta);
  console.log(`🚀 SERVIDOR DA FUNDAÇÃO ABC ONLINE NA PORTA: ${porta}`);
  console.log(`📜 DOCUMENTAÇÃO SWAGGER DISPONÍVEL EM: http://localhost:${porta}/api/docs`);
}
bootstrap();
