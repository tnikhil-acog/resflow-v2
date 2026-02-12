# ResFlow Docker Quick Reference

## Initial Setup

```bash
# Run setup script (recommended)
./setup-docker.sh

# Or manual setup
cp .env.example .env
# Edit .env with your configuration
docker-compose build
docker-compose up -d
```

## Daily Operations

### Service Management

```bash
docker-compose up -d          # Start services
docker-compose down           # Stop services
docker-compose restart app    # Restart app only
docker-compose ps             # Check status
```

### View Logs

```bash
docker-compose logs -f app                          # App logs
docker exec resflow_app tail -f /var/log/cron-daily.log   # Daily cron logs
docker exec resflow_app tail -f /var/log/cron-weekly.log  # Weekly cron logs
```

### Manual Task Generation

```bash
docker exec resflow_app /app/scripts/cron-runner.sh daily   # Daily tasks
docker exec resflow_app /app/scripts/cron-runner.sh weekly  # Weekly tasks
```

### Check Cron Status

```bash
docker exec resflow_app crontab -l              # List cron jobs
docker exec resflow_app ps aux | grep cron      # Check cron daemon
```

### Database Access

```bash
docker exec -it resflow_db psql -U resflowuser -d resflowdb
```

### Container Shell Access

```bash
docker exec -it resflow_app sh    # App container
docker exec -it resflow_db sh     # Database container
```

## Maintenance

### Update Application

```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup Database

```bash
docker exec resflow_db pg_dump -U resflowuser resflowdb > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
cat backup_20260202.sql | docker exec -i resflow_db psql -U resflowuser -d resflowdb
```

### View Resource Usage

```bash
docker stats resflow_app resflow_db
```

### Clean Up Docker

```bash
docker system prune              # Clean unused data
docker volume prune              # Clean unused volumes
docker-compose down -v           # Remove all (WARNING: deletes data!)
```

## Troubleshooting

### App won't start

```bash
docker-compose logs app          # Check logs
docker exec resflow_app env      # Check environment variables
```

### Cron jobs not running

```bash
docker exec resflow_app crontab -l                    # Verify cron installed
docker exec resflow_app /app/scripts/cron-runner.sh daily  # Test manually
```

### Database connection issues

```bash
docker-compose logs db                              # Check DB logs
docker exec resflow_db pg_isready -U resflowuser    # Test DB health
```

## Environment Variables

Key variables in `.env`:

- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - JWT signing key
- `BASE_URL` - Application URL
- `CRON_API_KEY` - Cron security key

## Ports

- `3000` - Application (HTTP)
- `5432` - PostgreSQL database

## Important Paths

Inside containers:

- `/app` - Application root
- `/app/scripts` - Cron scripts
- `/var/log/cron-*.log` - Cron logs
- `/var/lib/postgresql/data` - Database data
- `/backups` - Database backups

## URLs

- Application: http://localhost:3000
- Daily task generation: POST http://localhost:3000/api/tasks/generate-daily
- Weekly task generation: POST http://localhost:3000/api/tasks/generate-weekly

## Getting Help

1. Check logs: `docker-compose logs -f`
2. Read docs: `DOCKER_DEPLOYMENT.md`
3. Check cron: `docker exec resflow_app crontab -l`
4. Test manually: `docker exec resflow_app /app/scripts/cron-runner.sh daily`
