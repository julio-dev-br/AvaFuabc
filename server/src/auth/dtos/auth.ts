export interface SignUpDTO {
    name: string;
    email: string;
    password: string;
    role: string;
    cpf: string;
}
export interface SignInDTO {
    email: string;
    password: string;
}