# ---- Build stage --------------------------------------------------------
FROM node:18-alpine AS base
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY database ./database

# ---- Runtime stage --------------------------------------------------------
FROM node:18-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/src ./src
COPY --from=base /usr/src/app/database ./database
COPY package*.json ./

EXPOSE 5000
CMD ["node", "src/server.js"]
