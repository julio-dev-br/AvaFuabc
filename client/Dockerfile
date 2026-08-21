# 1. ETAPA DE CONSTRUÇÃO (BUILD)
FROM node:20-alpine AS build-step

WORKDIR /app

# Instala as dependências lendo os mapeamentos do Angular
COPY package*.json ./

# Instalação com a flag de tolerância para o Angular 17
RUN npm install --legacy-peer-deps

# 🌟 CORREÇÃO: A linha COPY prisma foi REMOVIDA daqui!
COPY . .
RUN npm run build -- --configuration=production

# 2. ETAPA DE EXECUÇÃO (SERVIDOR WEB NGINX)
FROM nginx:alpine

# Copia o nosso arquivo de rotas Nginx personalizado para dentro do container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados do Angular para a pasta padrão que o Nginx lê
COPY --from=build-step /app/dist/client/browser /usr/share/nginx/html

# Expõe a porta HTTP padrão
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
