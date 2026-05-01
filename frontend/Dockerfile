# ---- Base ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- All dependencies ----
FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install

# ---- Development target ----
# App source is mounted as a bind volume at runtime
FROM deps AS dev
ENV NODE_ENV=development
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- Build Nuxt app ----
FROM deps AS build
COPY . .
# Build args injected at build time for production
ARG NUXT_PUBLIC_API_URL
ENV NUXT_PUBLIC_API_URL=$NUXT_PUBLIC_API_URL
RUN npm run build

# ---- Production target ----
FROM node:22-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
