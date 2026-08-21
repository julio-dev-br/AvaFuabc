import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MateriaisService } from './materiais.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('materiais')
@UseGuards(AuthGuard) // 🛡️ Cadeado de segurança JWT ativado
export class MateriaisController {
  constructor(private readonly materiaisService: MateriaisService) {}

  // 📂 GET /materiais/aula/4
  @Get('aula/:id')
  async obterMateriaisPorAula(@Param('id', ParseIntPipe) aulaId: number) {
    return this.materiaisService.obterPorAula(aulaId);
  }

  // 📂 POST /materiais (Link SharePoint/Nuvem)
  @Post()
  async adicionarLink(@Body() body: { aulaId: number; nome: string; url: string }) {
    return this.materiaisService.adicionar({
      aulaId: Number(body.aulaId),
      nome: body.nome,
      url: body.url,
      tipo: 'LINK',
    });
  }

  // 📂 POST /materiais/upload (Arquivo físico do Computador)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/materiais', // Pasta raiz onde os PDFs vão morar no servidor
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

  // 📂 DELETE /materiais/5
  @Delete(':id')
  async removerMaterial(@Param('id', ParseIntPipe) id: number) {
    return this.materiaisService.remover(id);
  }
}
