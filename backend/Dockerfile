FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
RUN npm run build
EXPOSE 8080
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
