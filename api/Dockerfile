FROM node:20-alpine

# /app/api (not /app) so server.js's repo-root-relative .env path resolution
# (path.resolve(__dirname, '..', '.env') -> /app/.env) matches Dockerfile.combined's
# layout — lets local-dev/docker-compose.yml mount the real .env at /app/.env.
WORKDIR /app/api

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose API port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
