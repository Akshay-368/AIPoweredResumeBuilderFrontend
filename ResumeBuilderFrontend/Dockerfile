# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy source and build the Angular SSR app
COPY . .
RUN npm run build

# Runtime stage
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled SSR output
COPY --from=build /app/dist ./dist

# Render injects PORT dynamically; Angular SSR server reads process.env.PORT
EXPOSE 10000

CMD ["node", "dist/ResumeBuilderFrontend/server/server.mjs"]
