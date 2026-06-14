# 🎮 Outpost Games - Dockerized Application

## 🚀 Production Deployment

**✅ LIVE IN PRODUCTION:**

- 🌍 **Production Site**: https://outpostgamesrgv.com
- 🔧 **Direct URL**: https://outpost-games-rgv.fly.dev
- 📊 **Platform**: Fly.io (Dallas region)
- 💰 **Cost**: $0.10-$1.94/month

**📋 Production Configuration:**

```yaml
App Name: outpost-games-rgv
Region: Dallas (dfw)
RAM: 256MB shared CPU
Dockerfile: Dockerfile.combined
Auto-Sleep: 5 minute timeout ✅
CDN: Cloudflare (Free) ✅
SSL: Let's Encrypt ✅
Domain: outpostgamesrgv.com ✅
```

---

## 🔧 Local Development

**One-line setup:**

```bash
cd local-dev && ./quick-start.sh
```

**Or manually:**

```bash
# 1. Set up custom domain
cd local-dev
./setup-domain.sh

# 2. Install API dependencies
cd ../api && npm install && cd ..

# 3. Start Docker containers
cd local-dev
docker-compose up -d
```

**Access your local application:**

- 🌐 **Main Site**: http://outpostgamesrgv.test
- 🔧 **Admin Panel**: http://outpostgamesrgv.test/x/outpostAdmin
- 📱 **Alternative**: http://localhost

---

## 📁 Project Structure

```
outpost-games/
├── api/                    # Express.js backend
│   ├── server.js           # API server with Redis
│   ├── package.json        # API dependencies
│   └── Dockerfile          # API container config
├── src/                    # Vue.js frontend
│   ├── stores/
│   │   └── events.ts       # Event management (now using API)
│   └── views/
│       └── admin/
│           └── OutpostAdmin.vue  # Admin interface
├── local-dev/              # Local development files
│   ├── README.md           # Local dev documentation
│   ├── quick-start.sh      # One-command startup
│   ├── setup-domain.sh     # Domain setup script
│   ├── DOCKER_SETUP.md     # Detailed documentation
│   ├── docker-compose.yml  # Development orchestration
│   └── nginx.conf          # Development nginx config
├── docker-compose.prod.yml # Production orchestration
├── Dockerfile              # Frontend container config
└── nginx.prod.conf         # Production nginx configuration
```

---

## 🏗️ Architecture

**Services:**

1. **Redis (Alpine)** - 64MB memory limit, persists data
2. **API (Node.js Express)** - Minimal backend, ~50-100MB RAM
3. **Frontend (Nginx)** - Serves built Vue.js app, ~10-20MB RAM

**Total Resources:** ~150MB RAM maximum

**Data Flow:**

```
User → Nginx (Frontend)
         ↓
       API (Express)
         ↓
       Redis (Data Store)
```

---

## 💰 Cost-Optimized Deployment

### Platform Recommendations

| Platform          | Cost     | RAM   | Notes                                  |
| ----------------- | -------- | ----- | -------------------------------------- |
| **Fly.io** ⭐     | $1.94/mo | 256MB | ✅ **CURRENT PRODUCTION** - Best value |
| **DigitalOcean**  | $5/mo    | 512MB | Basic App Platform tier                |
| **Railway**       | ~$5/mo   | 512MB | Free tier available                    |
| **AWS Lightsail** | $3.50/mo | 512MB | Nano instance                          |

**Current Production Setup (outpostgamesrgv.com):**

- Platform: Fly.io (outpost-games-rgv)
- Region: Dallas (dfw)
- Cost: $0.10-$1.94/month (with auto-sleep)
- RAM: 256MB
- Deployment: Dockerfile.combined

### Redis Options

**Included (Recommended for low traffic):**

- Uses containerized Redis Alpine (64MB)
- Persistent volume for data
- Zero additional cost

**Managed (For production):**

- Upstash Redis: Free tier (10K commands/day)
- Redis Cloud: Free 30MB
- DigitalOcean Managed: $15/mo

---

## 🔧 Development Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart api
docker-compose restart web

# Stop all services
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Clear everything (including data)
docker-compose down -v
```

---

## 🌐 Custom Domain Setup

### Local Development

Already configured for: **outpostgamesrgv.test**

Run: `./setup-domain.sh`

### Production Domain (CONFIGURED ✅)

**Current production domain:** outpostgamesrgv.com

**Configuration:**

1. ✅ Domain purchased from Squarespace
2. ✅ Nameservers: cass.ns.cloudflare.com, gabriel.ns.cloudflare.com
3. ✅ Cloudflare DNS records:
   - A: @ → 66.241.124.41 (Proxied)
   - AAAA: @ → 2a09:8280:1::da:68a1:0 (Proxied)
   - CNAME: www → outpostgamesrgv.com (Proxied)
   - TXT: \_fly-ownership → app-l2mzo29
4. ✅ Fly.io certificate: Let's Encrypt (ECDSA)
5. ✅ Cloudflare SSL: Full mode
6. ✅ nginx.conf updated with: `server_name outpostgamesrgv.com www.outpostgamesrgv.com;`

**To replicate for your domain:**

1. Purchase domain from any registrar
2. Add to Cloudflare, get nameservers
3. Update registrar nameservers to Cloudflare
4. Get Fly.io IPs: `flyctl ips list`
5. Add DNS records in Cloudflare (see above)
6. Add certificate: `flyctl certs add yourdomain.com`
7. Update nginx.conf with your domain
8. Redeploy: `flyctl deploy`

See [DEPLOY_GUIDE.md - CDN Setup](DEPLOY_GUIDE.md#2-cdn-setup-cloudflare-free) for detailed steps.

---

## 📊 API Endpoints

| Method | Endpoint            | Description       |
| ------ | ------------------- | ----------------- |
| GET    | `/api/health`       | Health check      |
| GET    | `/api/events`       | Get all events    |
| POST   | `/api/events`       | Create new event  |
| PUT    | `/api/events/:id`   | Update event      |
| DELETE | `/api/events/:id`   | Delete event      |
| POST   | `/api/events/reset` | Reset to defaults |

---

## 🔐 Security & Admin

**Admin Panel:** http://outpostgamesrgv.test/x/outpostAdmin

⚠️ **Note:** The admin panel is "hidden" (not linked in navigation) but not secured with authentication. For production, consider:

- Adding password protection
- Using environment-based admin routes
- Implementing JWT authentication
- Rate limiting API endpoints

---

## 💾 Data Backup & Recovery

### Backup Redis Data

```bash
# Create backup
docker exec outpost-redis redis-cli SAVE
docker cp outpost-redis:/data/dump.rdb ./backup-$(date +%Y%m%d).rdb
```

### Restore Redis Data

```bash
# Restore from backup
docker cp ./backup-20260227.rdb outpost-redis:/data/dump.rdb
docker-compose restart redis
```

### Reset to Defaults

Visit admin panel and click "Reset to Defaults" button

---

## 🐛 Troubleshooting

### Services won't start

```bash
docker-compose logs
```

### Can't access custom domain

```bash
# Verify hosts file
cat /etc/hosts | grep outpostgamesrgv

# Should show: 127.0.0.1 outpostgamesrgv.test
```

### API connection errors

```bash
# Test API directly
curl http://localhost:3001/api/health

# Test Redis
docker exec outpost-redis redis-cli ping
```

### Clear and rebuild

```bash
docker-compose down -v
docker system prune -a
docker-compose up --build -d
```

---

## 📈 Monitoring

### Check Service Health

```bash
docker ps
```

All containers should show "healthy" status

### Resource Usage

```bash
docker stats
```

### Check API Health

```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok","message":"API is running"}
```

---

## 📚 Additional Resources

- **Full Documentation**: [DOCKER_SETUP.md](../../DOCKER_SETUP.md)
- **WPN Assets Guide**: [WPN_ASSET_ACCESS_GUIDE.md](WPN_ASSET_ACCESS_GUIDE.md)
- **Main README**: [README.md](README.md)

---

## 🎯 Next Steps

1. ✅ **Local Setup Complete** - Application running at http://outpostgamesrgv.test
2. 🚀 **Deploy to Production** - Choose platform from recommendations above
3. 🔐 **Secure Admin Panel** - Add authentication for production
4. 📊 **Monitor Resources** - Set up alerts for high usage
5. 🌐 **Custom Domain** - Point your domain to production server

---

## 💡 Tips

- Redis uses only 64MB RAM with LRU eviction
- Frontend is a static build, extremely lightweight
- API is stateless and can scale horizontally
- All containers use Alpine Linux for minimal size
- Health checks ensure automatic recovery
- Persistent volume keeps data across restarts

---

**Questions?** Check [DOCKER_SETUP.md](../../DOCKER_SETUP.md) for detailed documentation.

**Ready to deploy?** See deployment platform guides in [DOCKER_SETUP.md](../../DOCKER_SETUP.md).
