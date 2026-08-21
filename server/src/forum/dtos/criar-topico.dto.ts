export interface CriarTopicoDTO {
  aulaId?: number; // Opcional, caso queiram criar um tópico geral sem vincular a uma aula
  titulo: string;
  conteudo: string;
}
