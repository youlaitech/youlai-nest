FROM node:20-alpine as build-stage

WORKDIR /app

COPY package.json .

COPY .env .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install -g pnpm

RUN pnpm config set registry https://registry.npmmirror.com/

RUN pnpm install

COPY . .

RUN pnpm run build

# production stage
FROM node:20-alpine as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json
COPY --from=build-stage /app/.env /app/.env

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install -g pnpm

RUN pnpm config set registry https://registry.npmmirror.com/

RUN pnpm install

# 应用对外暴露端口，对应 SERVER_PORT
EXPOSE 8000

CMD ["node", "/app/main.js"]
