FROM node:20-alpine

WORKDIR /app

# Dependensi build untuk better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/db/data
ENV DB_PATH=/app/db/data/socialconnect.sqlite
ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "server.js"]
