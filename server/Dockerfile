FROM node:20

WORKDIR /usr/src/app

# Copia os manifestos de dependências e os esquemas do banco
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências gerando os links nativos de Linux
RUN npm install --legacy-peer-deps

# Copia todo o restante do código fonte do back-end
COPY . .

# 🌟 A MÁGICA DE INFRAESTRUTURA: Desativa o motor de busca do prisma.config.*
# Isso mata o erro de sintaxe e faz o Prisma v7/8 rodar em modo clássico imbatível!
ENV PRISMA_DISABLE_CONFIG=true

# Gera o Prisma Client nativo em ambiente Linux nativo
RUN npx prisma generate

# Compila o NestJS gerando a pasta dist final na raiz
RUN npm run build

# Expõe a porta do NestJS
EXPOSE 3000

# Inicializa o servidor NestJS estável de produção
CMD ["node", "dist/main.js"]
