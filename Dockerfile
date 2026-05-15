# Stage 1: Frontend build
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Install build tools for native modules (needed for vector-storage, better-sqlite3 etc)
RUN apk add --no-cache python3 make g++ gcc musl-dev

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

# Install build tools also in production for native modules that are compiled during install
RUN apk add --no-cache python3 make g++ gcc musl-dev

COPY package*.json ./
# Use --legacy-peer-deps and include dev deps if needed for native builds, but usually --production is fine if tools are present
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
