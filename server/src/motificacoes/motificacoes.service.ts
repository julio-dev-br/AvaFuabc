import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacoesService {
  constructor(private prisma: PrismaService) {}

  // 🌟 ATUALIZADO: Usa this.prisma.notification e ordena por created_at
  async listarDoUsuario(usuarioId: number) {
    return this.prisma.notification.findMany({
      where: { 
        usuario_id: usuarioId, 
        lida: false 
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // 🌟 ATUALIZADO: Alinhado com o modelo do seu banco
  async marcarComoLida(id: number) {
    return this.prisma.notification.update({
      where: { id: Number(id) },
      data: { lida: true }
    });
  }

  // 🌟 ATUALIZADO: Método utilitário para disparar alertas no sistema
  async disparar(usuarioId: number, titulo: string, mensagem: string) {
    return this.prisma.notification.create({
      data: { 
        usuario_id: usuarioId, 
        titulo, 
        mensagem 
      }
    });
  }
}
