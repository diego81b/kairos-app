# ---- Base ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- All dependencies (dev + prod) ----
FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install

# ---- Development target ----
# Source code is mounted as a bind volume at runtime
FROM deps AS dev
COPY tsconfig.json nest-cli.json ./
ENV NODE_ENV=development
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# ---- Build TypeScript ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- Production dependencies only ----
FROM base AS prod-deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev

# ---- Production target ----
FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3001
CMD ["node", "dist/main"]
