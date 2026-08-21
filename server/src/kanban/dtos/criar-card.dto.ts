export interface CriarCardDTO {
  colunaId: number;
  titulo: string;
  descricao?: string;
  dataEntrega?: string; // String que converteremos para Date
}