import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProtheusMockController } from './protheus.controller';
import { ProtheusService } from './protheus.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 8000,
      maxRedirects: 5,
    }),
  ],
  controllers: [ProtheusMockController],
  providers: [ProtheusService],
  exports: [ProtheusService],
})
export class ProtheusModule {}
