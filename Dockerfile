
# Stage 1: Install dependencies
FROM node:18 AS development

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# Stage 2: Build the application
FROM development AS build
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# Stage 3: Production image
FROM node:18-alpine AS production

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
