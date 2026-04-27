FROM node:20-alpine AS frontend-build
WORKDIR /app
RUN apk add --no-cache python3 make g++ 
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install build tools for native dependencies
RUN apk add --no-cache python3 make g++ 

# Copy package info and install production deps
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy backend code
COPY server/ ./server/

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./dist

# Set env vars
ENV NODE_ENV=production
ENV PORT=8080

# Expose Cloud Run default port
EXPOSE 8080

CMD ["node", "server/index.js"]
