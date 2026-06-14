# 🚀 Production Deployment Guide

## ✅ Production Status

**LIVE DEPLOYMENT:**

- 🌍 **Website**: https://outpostgamesrgv.com
- 📊 **Platform**: Fly.io (outpost-games-rgv)
- 💰 **Actual Cost**: $0.10-$1.94/month
- 🌐 **CDN**: Cloudflare (Free)
- 🔒 **SSL**: Let's Encrypt (Active)

---

## Quick Start For Replication

This application is **optimized for low-cost deployment** and you can replicate our setup!

### Estimated Monthly Cost: **$0.93 - $2.77**

---

## 📋 What's Included

### Optimization Files Created:

1. **`docker-compose.prod.yml`** - Production Docker setup with resource limits
2. **`Dockerfile.combined`** - Single-container deployment (saves 50% on costs)
3. **`nginx.prod.conf`** - Optimized Nginx with security headers
4. **`fly.toml`** - Fly.io configuration (recommended platform)
5. **`deploy.sh`** - Automated deployment script
6. **`.env.example`** - Environment configuration template

---

## 🎯 Recommended Deployment Path

### Option 1: Fly.io (Lowest Cost - $1.94/month) ✅ IN PRODUCTION

**Perfect for:** Budget-conscious deployment, auto-scaling, minimal maintenance

**✅ Current Production:** outpost-games-rgv (https://outpostgamesrgv.com)

#### Setup (5 minutes):

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
flyctl auth login

# 3. Launch app (we used: outpost-games-rgv)
flyctl launch --name your-app-name

# 4. Enable auto-sleep (IMPORTANT for cost savings)
flyctl scale idle-timeout 5m

# 5. Deploy
flyctl deploy

# 6. Open in browser
flyctl open
```

**Production Configuration:**

- App: outpost-games-rgv
- Region: Dallas (dfw)
- RAM: 256MB shared CPU
- Auto-sleep: 5 minute timeout
- Dockerfile: Dockerfile.combined

**External Redis (Free):**

- Sign up at https://upstash.com
- Create Redis database
- Copy connection URL
- Use in step 4 above

**Total Cost: $1.94/month** (app) + $0 (Upstash free tier) = **$1.94/month**

---

### Option 2: VPS Deployment (AWS Lightsail - $3.50/month)

**Perfect for:** Full control, predictable costs, no cold starts

#### Setup (10 minutes):

```bash
# 1. Create Lightsail instance ($3.50/month - 512MB RAM)
# Choose Ubuntu 22.04 LTS

# 2. SSH into instance
ssh ubuntu@your-instance-ip

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 4. Clone repository
git clone https://github.com/yourusername/outpost-games.git
cd outpost-games

# 5. Configure environment
cp .env.example .env
nano .env  # Update values

# 6. Deploy
sudo docker compose -f docker-compose.prod.yml up -d --build

# 7. Verify deployment
curl http://localhost/
curl http://localhost:3001/api/health

# 8. Set up SSL (optional but recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

**Total Cost: $3.50/month** (includes everything)

---

### Option 3: Custom Domain Setup with Cloudflare ✅ PRODUCTION SETUP

**Perfect for:** Professional presence, CDN benefits, custom branding

**✅ Implemented for:** outpostgamesrgv.com

#### Setup (20 minutes):

**Prerequisites:**

- Domain purchased (any registrar - we used Squarespace)
- App deployed to Fly.io (see Option 1 above)

**Step 1: Sign up for Cloudflare**

```bash
# Visit https://dash.cloudflare.com/sign-up
# Create free account
```

**Step 2: Add Domain to Cloudflare**

1. Click "Add Site"
2. Enter your domain: `yourdomain.com`
3. Select "Free" plan
4. Cloudflare will scan existing DNS records

**Step 3: Get Cloudflare Nameservers**
Cloudflare will provide nameservers like:

```
cass.ns.cloudflare.com
gabriel.ns.cloudflare.com
```

**Step 4: Update Nameservers at Registrar**

1. Log into your domain registrar (Squarespace, Namecheap, etc.)
2. Find DNS or Nameserver settings
3. Replace registrar nameservers with Cloudflare's
4. Save changes
5. Wait 5-60 minutes for propagation

**Step 5: Get Fly.io IP Addresses**

```bash
flyctl ips list

# Example output:
# IPv4: 66.241.124.41 (shared)
# IPv6: 2a09:8280:1::da:68a1:0 (dedicated)
```

**Step 6: Configure DNS Records in Cloudflare**

Add these records in Cloudflare DNS dashboard:

| Type  | Name            | Content                | Proxy Status    | TTL  |
| ----- | --------------- | ---------------------- | --------------- | ---- |
| A     | @               | [your-fly-ipv4]        | 🟠 Proxied      | Auto |
| AAAA  | @               | [your-fly-ipv6]        | 🟠 Proxied      | Auto |
| CNAME | www             | yourdomain.com         | 🟠 Proxied      | Auto |
| TXT   | \_fly-ownership | [from fly certs setup] | Gray (DNS only) | Auto |

**Important:** Enable proxy (orange cloud 🟠) for A, AAAA, and CNAME records!

**Step 7: Get Fly Ownership TXT Record**

```bash
flyctl certs setup yourdomain.com

# Look for line like:
# TXT _fly-ownership.yourdomain.com → app-xxxxx
```

Add this TXT record to Cloudflare.

**Step 8: Add ACME Challenge CNAME (Speeds up certificate issuance)**

```bash
# From the same flyctl certs setup command:
# CNAME _acme-challenge.yourdomain.com → yourdomain.com.xxxxx.flydns.net
```

Add this CNAME record to Cloudflare.

**Step 9: Temporarily Disable Cloudflare Proxy**

1. In Cloudflare DNS, click the orange cloud on A and AAAA records
2. Turn them gray (DNS only)
3. Wait 2-3 minutes

**Step 10: Add Certificate to Fly.io**

```bash
flyctl certs add yourdomain.com
flyctl certs add www.yourdomain.com

# Wait a moment, then check:
flyctl certs check yourdomain.com

# Should show: Status = Issued ✅
```

**Step 11: Re-enable Cloudflare Proxy**

1. In Cloudflare DNS, click gray cloud on A and AAAA records
2. Turn them orange 🟠 (Proxied)
3. Save changes

**Step 12: Configure SSL in Cloudflare**

1. Go to SSL/TLS → Overview
2. Set encryption mode: **Full** (not Flexible, not Full strict)
3. Enable "Always Use HTTPS"
4. Enable "Automatic HTTPS Rewrites"

**Step 13: Update nginx Configuration**

```bash
# Edit nginx.prod.conf locally
nano nginx.prod.conf

# Update server_name:
server_name yourdomain.com www.yourdomain.com;

# Redeploy to Fly.io
flyctl deploy
```

**Step 14: Test Your Domain**

```bash
# Should return HTTP/2 200 with cloudflare headers
curl -I https://yourdomain.com

# Look for:
# server: cloudflare
# cf-cache-status: HIT (after first request)
# cf-ray: xxxxx
```

**Production Example (outpostgamesrgv.com):**

- Domain registrar: Squarespace
- DNS/CDN: Cloudflare
- Hosting: Fly.io (outpost-games-rgv)
- SSL: Let's Encrypt (ECDSA)
- Cost: Domain $10/year + Fly.io $1.94/mo = ~$2.77/mo total

**Complete guide with screenshots:** [DEPLOY_GUIDE.md - CDN Setup](DEPLOY_GUIDE.md#2-cdn-setup-cloudflare-free)

---

### Option 4: Railway ($5-10/month)

**Perfect for:** Easiest deployment, integrated services, auto-deploy

#### Setup (2 minutes):

```bash
# 1. Visit https://railway.app
# 2. Click "New Project" → "Deploy from GitHub repo"
# 3. Connect your repository
# 4. Add Redis database (click "+ New" → "Database" → "Redis")
# 5. Set environment variables in dashboard:
#    - NODE_ENV=production
#    - PORT=3001
# 6. Deploy automatically happens on git push!
```

**Total Cost: $5-10/month** (includes Redis)

---

## 🔧 Pre-Deployment Checklist

### 1. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

**Required variables:**

- `REDIS_URL` - Your Redis connection string
- `NODE_ENV=production`
- `VITE_API_URL=/api` (or your production domain)

### 2. Update Domain References

Search and replace in these files:

- `public/robots.txt` - Update domain
- `public/sitemap.xml` - Update URLs
- `index.html` - Update canonical URLs
- `nginx.prod.conf` - Update server_name

### 3. Test Locally

```bash
# Test Docker builds
./test-deploy.sh

# Test production config
docker-compose -f docker-compose.prod.yml up --build

# Access: http://localhost
# API health: http://localhost:3001/api/health
```

### 4. Security Check

- [ ] HTTPS enabled (automatic on Fly.io/Railway)
- [ ] CORS configured for your domain
- [ ] Admin panel secured (`/x/outpostAdmin`)
- [ ] Environment secrets not in repository
- [ ] Redis authentication enabled (if public)

---

## 📊 Resource Monitoring

### Check Application Health

**Fly.io:**

```bash
flyctl status
flyctl logs
flyctl metrics
```

**Docker (VPS):**

```bash
docker stats
docker-compose logs -f
docker ps
```

**Railway:**

- Check dashboard metrics
- View logs in web UI

### Set Up Monitoring (Free)

1. **UptimeRobot** (https://uptimerobot.com)
   - Monitor every 5 minutes
   - Email alerts on downtime
   - Free for 50 monitors

2. **Sentry** (https://sentry.io)
   ```bash
   npm install @sentry/vue @sentry/node
   ```

   - Free tier: 5,000 errors/month
   - Real-time error tracking

---

## 💰 Cost Optimization Tips

### Use External Redis (Free)

Instead of running Redis in Docker:

- **Upstash**: Free tier (10K commands/day)
- **Savings**: ~$2-5/month

### Enable CDN (Free)

- **Cloudflare**: Free plan
- Caches 95% of assets globally
- Reduces server load 10x

### Auto-Sleep (Fly.io)

```toml
# In fly.toml
[http_service]
  auto_stop_machines = true
  min_machines_running = 0
```

- **Savings**: Pay only for active hours
- Wakes in ~500ms on request

### Combined Container

Use `Dockerfile.combined` instead of separate containers:

```bash
# Build combined image
docker build -t outpost-games -f Dockerfile.combined .

# Run single container
docker run -p 80:80 outpost-games
```

- **Savings**: 50% fewer resources needed

---

## 🚀 Deployment Commands

### Deploy Script (Interactive)

```bash
./deploy.sh
```

Choose from menu:

1. Docker Compose (local/VPS)
2. Fly.io
3. Health check
4. View logs
5. View stats

### Manual Commands

**Development:**

```bash
npm run dev
docker-compose up
```

**Production:**

```bash
# Build
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

**Fly.io:**

```bash
flyctl deploy              # Deploy
flyctl logs                # View logs
flyctl ssh console         # SSH into container
flyctl scale count 2       # Scale to 2 instances
flyctl scale memory 512    # Increase RAM
```

---

## 📈 Scaling Guide

### Current Capacity (256MB RAM)

- **500-1,000** daily active users
- **5,000-10,000** page views/day
- **50-100** concurrent users

### When to Scale

**Upgrade to 512MB ($3.94/mo):**

- Consistent latency > 500ms
- Memory usage > 80%
- 1,000+ daily users

**Add Second Instance ($7.88/mo total):**

- Need high availability (99.99% uptime)
- Traffic spikes causing downtime
- 5,000+ daily users

**Upgrade Redis:**

- Upstash free tier exhausted (10K commands/day)
- Need more than 100MB storage
- Cost: $0.20 per 100K additional commands

---

## 🛠️ Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs api
docker-compose logs web

# Rebuild without cache
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### High memory usage

```bash
# Check stats
docker stats

# Reduce Redis memory
# In docker-compose.prod.yml:
command: redis-server --maxmemory 32mb ...

# Restart
docker-compose restart redis
```

### Slow API responses

```bash
# Check Redis connection
docker exec -it outpost-api sh
redis-cli -h redis ping

# Check API health
curl http://localhost:3001/api/health

# View detailed logs
docker-compose logs -f --tail=100 api
```

### SSL certificate issues

```bash
# Renew Let's Encrypt (VPS)
sudo certbot renew

# Check certificate expiry
sudo certbot certificates
```

---

## 📚 Additional Documentation

- **`DEPLOYMENT.md`** - Complete deployment guide with all platforms
- **`PRODUCTION_STATUS.md`** - Current live status and metrics
- **`README.md`** - Application overview and features

---

## ✅ Post-Deployment Checklist

### Production Deployment (outpostgamesrgv.com)

- [x] Application accessible via domain
- [x] HTTPS working (green lock icon)
- [x] API health check returns success
- [x] Admin panel accessible at `/x/outpostAdmin`
- [x] Events data persists across restarts
- [x] Product images load correctly
- [x] Mobile responsiveness verified
- [x] Cloudflare CDN active (cf-cache-status: HIT)
- [x] SSL certificate issued (Let's Encrypt)
- [x] DNS configured (A/AAAA to Fly.io IPs)
- [x] Auto-sleep enabled (5 minute timeout)
- [x] Custom domain working (outpostgamesrgv.com)
- [ ] Uptime monitoring configured
- [ ] Error tracking enabled
- [ ] Robots.txt updated with production domain
- [ ] Sitemap.xml updated with production URLs

### For Your Deployment

- [ ] Application accessible via domain
- [ ] HTTPS working (green lock icon)
- [ ] API health check returns success
- [ ] Admin panel accessible at `/x/outpostAdmin`
- [ ] Events data persists across restarts
- [ ] Product images load correctly
- [ ] Mobile responsiveness verified
- [ ] Lighthouse score > 90
- [ ] Uptime monitoring configured
- [ ] Error tracking enabled
- [ ] SSL auto-renewal configured (VPS only)
- [ ] Backup strategy documented
- [ ] DNS records configured
- [ ] Robots.txt updated with production domain
- [ ] Sitemap.xml updated with production URLs

---

## 🎉 Success!

Your application is now running in production!

**Production Example (outpostgamesrgv.com):**

- **Web**: https://outpostgamesrgv.com
- **Direct URL**: https://outpost-games-rgv.fly.dev
- **Admin**: https://outpostgamesrgv.com/x/outpostAdmin
- **Platform**: Fly.io (Dallas region)
- **CDN**: Cloudflare (Free)
- **Cost**: $0.10-$1.94/month

**Access your site:**

- **Web**: https://yourdomain.com
- **Admin**: https://yourdomain.com/x/outpostAdmin
- **Health Check**: https://yourdomain.com/api/health

**Performance Tips:**

- First request after idle may take 500ms (auto-sleep wake time)
- Cloudflare caches static assets globally (look for cf-cache-status: HIT)
- Monitor costs with: `flyctl billing`
- Check uptime with: `flyctl status`

**Next Steps:**

1. Set up uptime monitoring (UptimeRobot - free)
2. Configure error tracking (Sentry - free tier)
3. Update robots.txt and sitemap.xml with your domain
4. Test site load speed (Google PageSpeed Insights)
5. Monitor first month costs to optimize further

- **API Health**: https://yourdomain.com/api/health

**Monitor:**

- UptimeRobot dashboard
- Platform metrics (Fly.io/Railway)
- Error tracking (Sentry)

**Next steps:**

1. Share with users! 🎊
2. Monitor performance
3. Scale as needed
4. Iterate and improve

Need help? Check the troubleshooting section or open an issue on GitHub.

---

**Built with ❤️ for The Outpost Games community**
