# Outpost Games - Docker Setup

## Overview

This application is fully dockerized with a lightweight architecture optimized for minimal cost:

- **Frontend**: Vue.js application served by Nginx
- **API**: Minimal Node.js/Express backend
- **Database**: Redis (Alpine) configured for minimal memory usage (64MB)

## Architecture

```
┌─────────────────┐
│  Nginx (80)     │  ← Frontend (Vue.js build)
│  + API Proxy    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌─▼────────┐
│ API   │  │  Redis   │
│ (3001)│◄─┤  (6379)  │
└───────┘  └──────────┘
```

## Quick Start

### 1. Set Up Custom Domain (Optional but Recommended)

**Automated Setup (macOS/Linux):**
```bash
chmod +x setup-domain.sh
./setup-domain.sh
```

**Manual Setup:**
Add this line to `/etc/hosts`:
```
127.0.0.1 outpostgamesrgv.test
```

On **macOS/Linux**:
```bash
sudo nano /etc/hosts
```

On **Windows** (Run as Administrator):
```cmd
notepad C:\Windows\System32\drivers\etc\hosts
```

### 2. Install API Dependencies

```bash
cd api
npm install
cd ..
```

### 3. Build and Start Containers

```bash
docker-compose up -d
```

This will:
- Build the frontend and backend Docker images
- Start Redis with minimal memory configuration
- Launch all services with health checks

### 4. Access the Application

- **Custom Domain**: http://outpostgamesrgv.test
- **Localhost**: http://localhost
- **Admin Panel**: http://outpostgamesrgv.test/x/outpostAdmin

## Development

### Local Development (Without Docker)

**Terminal 1 - API:**
```bash
cd api
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
```

Access at: http://localhost:5173 (with API at http://localhost:3001)

### Docker Development

Watch logs:
```bash
docker-compose logs -f
```

Restart a specific service:
```bash
docker-compose restart web
docker-compose restart api
docker-compose restart redis
```

Stop all services:
```bash
docker-compose down
```

Stop and remove volumes (clears Redis data):
```bash
docker-compose down -v
```

## Production Deployment

### Building for Production

```bash
# Build optimized images
docker-compose build --no-cache

# Start in production mode
docker-compose up -d
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=/api
```

### Resource Usage

**Estimated resource requirements:**
- Redis: ~64MB RAM (configured with maxmemory limit)
- API: ~50-100MB RAM
- Frontend (Nginx): ~10-20MB RAM
- **Total**: ~150MB RAM maximum

This makes it extremely cost-effective for deployment on:
- DigitalOcean App Platform (Basic tier: $5/mo)
- Fly.io (Free tier or $1.94/mo)
- Railway (Free tier or ~$5/mo)
- AWS Lightsail (Nano instance: $3.50/mo)

## Deployment Platforms

### DigitalOcean App Platform

1. Push code to GitHub/GitLab
2. Create new App in DigitalOcean
3. Select repository
4. Add Redis Managed Database (Dev plan: $15/mo) OR use internal Redis container
5. Set environment variables
6. Deploy

### Fly.io (Recommended for Low Cost)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy (will auto-detect Docker)
fly launch

# Set custom domain
fly domains add outpostgamesrgv.com
```

### Railway

1. Push to GitHub
2. Create new project in Railway
3. Deploy from GitHub
4. Add Redis service
5. Connect custom domain

## Data Persistence

Event data is stored in Redis with:
- **Persistence**: Snapshot every 60 seconds if data changes
- **Memory Policy**: LRU eviction when memory limit reached
- **Volume**: Persistent volume for data across restarts

### Backup Redis Data

```bash
# Export data
docker exec outpost-redis redis-cli SAVE
docker cp outpost-redis:/data/dump.rdb ./backup-dump.rdb

# Restore data
docker cp ./backup-dump.rdb outpost-redis:/data/dump.rdb
docker-compose restart redis
```

### Reset to Default Events

Visit the admin panel: http://outpostgamesrgv.test/x/outpostAdmin
Click "Reset to Defaults" button

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/reset` - Reset to default events

## Troubleshooting

### Container won't start
```bash
docker-compose logs api
docker-compose logs web
docker-compose logs redis
```

### Redis connection issues
```bash
# Check Redis is running
docker exec outpost-redis redis-cli ping
# Should return: PONG
```

### Frontend can't reach API
- Check nginx proxy configuration in `nginx.conf`
- Verify API is running: `curl http://localhost:3001/api/health`

### Clear everything and start fresh
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build -d
```

## Security Notes

- The admin panel (`/x/outpostAdmin`) is "hidden" but not secured
- For production, add authentication to the admin routes
- Consider adding rate limiting to API endpoints
- Use HTTPS in production (handled by deployment platform)

## Cost Optimization Tips

1. **Use managed Redis sparingly** - The included Redis container uses only 64MB
2. **Combine services** - Frontend and API in one container if needed
3. **Use platform-specific Redis** - Many platforms include free Redis
4. **CDN for assets** - Offload static assets to free CDNs like Cloudflare
5. **Optimize images** - Current Docker images use Alpine for minimal size

## Monitoring

### Health Checks

All services include health checks:
- **API**: `GET /api/health`
- **Frontend**: HTTP request to root
- **Redis**: `redis-cli ping`

View health status:
```bash
docker ps
```

### Resource Usage

```bash
docker stats
```

## Support

For issues or questions, check:
- Docker logs: `docker-compose logs`
- API health: http://outpostgamesrgv.test/api/health
- Redis status: `docker exec outpost-redis redis-cli info`
