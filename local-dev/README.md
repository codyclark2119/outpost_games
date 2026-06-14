# 🛠️ Local Development Environment

This directory contains files specifically for local development with Docker.

## 📁 Contents

| File                   | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| **quick-start.sh**     | One-command script to set up and start local Docker environment |
| **setup-domain.sh**    | Configures local domain (outpostgamesrgv.test) in /etc/hosts    |
| **DOCKER_SETUP.md**    | Complete documentation for local Docker development             |
| **docker-compose.yml** | Docker Compose configuration for local development              |
| **nginx.conf**         | Nginx configuration for local development                       |

## 🚀 Quick Start

### Option 1: NPM Scripts (Easiest)

From the project root, use these convenient commands:

```bash
# First-time setup
npm run docker:setup

# Daily development
npm run docker:up       # Start containers
npm run docker:logs     # View logs
npm run docker:down     # Stop containers
npm run docker:restart  # Restart services
```

### Option 2: Automated Script

```bash
cd local-dev
chmod +x quick-start.sh
./quick-start.sh
```

This will:

1. Set up the custom domain (outpostgamesrgv.test)
2. Install API dependencies
3. Build and start all Docker containers

### Option 3: Manual Setup

1. **Set up custom domain** (optional but recommended):

   ```bash
   cd local-dev
   chmod +x setup-domain.sh
   ./setup-domain.sh
   ```

2. **Start Docker containers**:
   ```bash
   cd local-dev
   docker-compose up -d
   ```

## 🌐 Access Points

Once running, access the application at:

- **Custom Domain**: http://outpostgamesrgv.test
- **Localhost**: http://localhost
- **Admin Panel**: http://outpostgamesrgv.test/x/outpostAdmin

## 📚 Documentation

For detailed setup instructions, troubleshooting, and development workflows, see [DOCKER_SETUP.md](DOCKER_SETUP.md).

## 🔧 Common Commands

### From Project Root (using npm scripts)

```bash
npm run docker:up       # Start containers in detached mode
npm run docker:down     # Stop and remove containers
npm run docker:logs     # View real-time logs
npm run docker:restart  # Restart services
npm run docker:setup    # Run quick-start.sh
```

### From local-dev/ Directory (using docker-compose)

```bash
# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Restart services
docker-compose restart

# Rebuild containers
docker-compose up -d --build

# Check status
docker-compose ps
```

## 🆚 Production vs Development

| Aspect   | Local Development    | Production                |
| -------- | -------------------- | ------------------------- |
| Config   | `docker-compose.yml` | `docker-compose.prod.yml` |
| Nginx    | `nginx.conf`         | `nginx.prod.conf`         |
| Domain   | outpostgamesrgv.test | outpostgamesrgv.com       |
| Location | `local-dev/`         | Project root              |

## 💡 Tips

- **First time setup**: Run `quick-start.sh` for the easiest experience
- **Multiple projects**: The custom domain helps avoid port conflicts
- **Hot reload**: Frontend supports hot module replacement in dev mode
- **API changes**: Restart API container after code changes: `docker-compose restart api`

## 🐛 Troubleshooting

If you encounter issues:

1. Check logs: `docker-compose logs`
2. Verify Docker is running: `docker info`
3. Check ports aren't in use: `lsof -i :80 -i :3001`
4. See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed troubleshooting

---

**Need help?** See the main [README.md](../README.md) or [DOCKER_SETUP.md](DOCKER_SETUP.md).
