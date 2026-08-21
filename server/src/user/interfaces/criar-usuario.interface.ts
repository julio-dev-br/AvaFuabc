export interface CriarUsuarioInput {
  email: string;
  name: string;
  password?: string;
  role: 'admin' | 'manager' | 'user';
  empresa_id: number;
  unidade_id: number;
  departamento_id: number;
  cargo_id: number;
}
