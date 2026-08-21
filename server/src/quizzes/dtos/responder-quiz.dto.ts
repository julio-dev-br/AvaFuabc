export interface RespostaItemDTO {
  perguntaId: number;
  alternativaId: number;
}

export interface ResponderQuizDTO {
  respostas: RespostaItemDTO[];
}
