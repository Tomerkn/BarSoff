# Stage 1: Frontend build
FROM node:24-slim AS frontend-build
WORKDIR /app

# Install full build-essential for native modules (SQLite requires it during npm install)
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:24-slim
WORKDIR /app

# Runtime dependencies for SQLite
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy backend code
COPY server/ ./server/

# Copy built frontend
COPY --from=frontend-build /app/dist ./dist

# Set production env
ENV NODE_ENV=production
ENV PORT=8080
ENV NODE_OPTIONS="--no-deprecation"

EXPOSE 8080

# Start the server
CMD ["node", "server/index.js"]
