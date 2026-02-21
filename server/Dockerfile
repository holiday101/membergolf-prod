FROM node:18-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY server/ ./

RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/server.js"]
