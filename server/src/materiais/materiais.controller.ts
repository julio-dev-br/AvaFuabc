import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MateriaisService } from './materiais.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('materiais')
@UseGuards(AuthGuard) 
export class MateriaisController {
  constructor(private readonly materiaisService: MateriaisService) {}

  @Get('aula/:id')
  async obterMateriaisPorAula(@Param('id', ParseIntPipe) aulaId: number) {
    return this.materiaisService.obterPorAula(aulaId);
  }

  @Post()
  async adicionarLink(@Body() body: { aulaId: number; nome: string; url: string }) {
    return this.materiaisService.adicionar({
      aulaId: Number(body.aulaId),
      nome: body.nome,
      url: body.url,
      tipo: 'LINK',
    });
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/materiais', 
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `doc-${uniqueSuffix}${ext}`);
      },
    }),
  }))

  async uploadArquivo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { aulaId: string; nome: string }
  ) {
    const urlLocal = `/uploads/materiais/${file.filename}`;
    return this.materiaisService.adicionar({
      aulaId: Number(body.aulaId),
      nome: body.nome,
      url: urlLocal,
      tipo: 'ARQUIVO',
    });
  }

  @Delete(':id')
  async removerMaterial(@Param('id', ParseIntPipe) id: number) {
    return this.materiaisService.remover(id);
  }
}
