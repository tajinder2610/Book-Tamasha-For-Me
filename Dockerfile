# old code:
# Docker support is optional in this project. This Dockerfile does not affect the current runtime setup unless an image is explicitly built from it.

# syntax=docker/dockerfile:1

FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=server-builder /app/server ./server
COPY --from=client-builder /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 8082
CMD ["node", "server.js"]
