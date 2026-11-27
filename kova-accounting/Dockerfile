FROM node:20-alpine AS contracts
WORKDIR /workspace/kova-contracts
COPY kova-contracts/package.json ./
RUN npm install --no-audit --no-fund
COPY kova-contracts/tsconfig.json ./
COPY kova-contracts/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY kova-accounting/package.json ./
RUN node -e "const fs=require('fs');const p=require('./package.json');delete p.dependencies['@kova/contracts'];fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=contracts /workspace/kova-contracts/package.json /contracts/package.json
COPY --from=contracts /workspace/kova-contracts/dist /contracts/dist
RUN cd /contracts && npm install --omit=dev --no-audit --no-fund
RUN npm install --omit=dev --no-audit --no-fund /contracts
COPY kova-accounting/dist ./dist
EXPOSE 8085
CMD ["node", "dist/server.js"]
