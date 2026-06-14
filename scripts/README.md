# 🛠️ Scripts

Utility scripts for deployment, testing, and optimization checking.

## 📋 Available Scripts

### 🚀 deploy.sh

**Interactive deployment script**

```bash
./scripts/deploy.sh
```

**Features:**

- Menu-driven interface
- Deploy with Docker Compose
- Deploy to Fly.io
- Health checks
- View logs
- View resource stats
- Cleanup

**When to use:** When you want an easy interactive deployment experience.

---

### ✅ check-optimization.sh

**Check optimization status**

```bash
./scripts/check-optimization.sh
```

**Features:**

- Checks all 6 cost-saving strategies
- Color-coded status (✓ ✗ ⚠)
- Estimates monthly cost
- Provides action recommendations
- Links to relevant documentation

**When to use:** After deployment to verify optimizations are implemented.

**Example output:**

```
🔍 Cost Optimization Status Check
==================================
1. External Redis (Upstash): ✓ Configured
2. Cloudflare CDN: ⚠ Manual check required
3. Combined Container: ✓ Available
4. Auto-Sleep: ✓ Enabled
5. Image Optimization: ✗ Not implemented
6. Static Site Generation: ⚠ Not needed

📈 Summary: 4/6 optimizations implemented
```

---

### 🧪 test-deploy.sh

**Validate deployment configurations**

```bash
./scripts/test-deploy.sh
```

**Features:**

- Tests standard Dockerfile builds
- Tests API Dockerfile builds
- Tests combined Dockerfile builds
- Validates docker-compose.yml (local-dev)
- Validates docker-compose.prod.yml
- Provides deployment instructions on success

**When to use:** Before deploying to verify all Docker configurations build correctly.

---

## 🎯 Typical Workflow

1. **Before first deployment:**

   ```bash
   ./scripts/test-deploy.sh  # Verify configs
   ./scripts/deploy.sh       # Deploy interactively
   ```

2. **After deployment:**

   ```bash
   ./scripts/check-optimization.sh  # Check what's implemented
   ```

3. **For updates:**
   ```bash
   ./scripts/deploy.sh  # Redeploy with updates
   ```

## 📚 Documentation

For complete deployment guide, see:

- [docs/deployment/README.md](../docs/deployment/README.md) - Main deployment guide
- [docs/deployment/DEPLOY_GUIDE.md](../docs/deployment/DEPLOY_GUIDE.md) - Step-by-step instructions
- [docs/deployment/PRODUCTION_STATUS.md](../docs/deployment/PRODUCTION_STATUS.md) - Live status

## 🔧 Script Requirements

All scripts require:

- **Bash/Zsh** shell
- **Docker** (for test-deploy.sh and deploy.sh)
- **flyctl** CLI (optional, for Fly.io deployment)

Scripts are executable by default. If needed:

```bash
chmod +x scripts/*.sh
```

## 💡 Tips

**Run from project root:**

```bash
# ✓ Correct
./scripts/check-optimization.sh

# ✗ Wrong
cd scripts && ./check-optimization.sh
```

**Get help:**
All scripts show usage info and options when run.

---

Built with ❤️ for The Outpost Games community
