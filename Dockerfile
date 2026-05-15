# Stage 1: Frontend build
FROM node:20-slim AS frontend-build
WORKDIR /app

# Install build tools for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app

# Install runtime dependencies for better-sqlite3 and others
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    gcc \
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

EXPOSE 8080

# Start the server
CMD ["node", "server/index.js"]
