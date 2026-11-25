FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY dist ./dist

EXPOSE 8084

CMD ["node", "dist/server.js"]
