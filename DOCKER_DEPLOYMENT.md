# ResFlow Docker Deployment with Cron Jobs

This guide explains how to deploy ResFlow with automated task generation on your own servers using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- Port 3000 available (or configure different port)

## Quick Start

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
# Database Configuration
POSTGRES_PASSWORD=your-secure-database-password

# Application Configuration
JWT_SECRET=your-secure-jwt-secret-key
BASE_URL=http://localhost:3000  # Your nginx will route to this
NODE_ENV=production

# Cron Job Security (recommended)
CRON_API_KEY=your-secure-cron-api-key
```

**Note:** LDAP authentication is handled directly by the application using username/password verification. No additional LDAP configuration is required.

### 2. Build and Start Services

```bash
# Build the Docker images
docker-compose build

# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
```

**Note:** Your nginx server will handle external routing. The application runs on port 3000 inside the container.

### 3. Verify Cron Jobs

Check if cron jobs are installed:

```bash
# Access the app container
docker exec -it resflow_app sh

# List installed cron jobs
crontab -l

# Check cron logs
tail -f /var/log/cron-daily.log
tail -f /var/log/cron-weekly.log
```

## Cron Schedule

The following cron jobs are automatically configured:

| Job                 | Schedule                | Description                                                    |
| ------------------- | ----------------------- | -------------------------------------------------------------- |
| Daily Log Tasks     | Every day at 9:00 AM    | Creates daily work log reminders for all active employees      |
| Weekly Report Tasks | Every Monday at 9:00 AM | Creates weekly report reminders for employees with allocations |

### Customizing Cron Schedule

Edit `scripts/crontab` to change the schedule:

```bash
# Cron format: minute hour day month weekday command

# Example: Run daily tasks at 8:30 AM
30 8 * * * /app/scripts/cron-runner.sh daily >> /var/log/cron-daily.log 2>&1

# Example: Run weekly tasks on Friday at 5:00 PM
0 17 * * 5 /app/scripts/cron-runner.sh weekly >> /var/log/cron-weekly.log 2>&1
```

After changing the crontab file, restart the container:

```bash
docker-compose restart app
```

## Manual Task Generation

### Trigger Daily Task Generation

```bash
# From host machine
docker exec resflow_app /app/scripts/cron-runner.sh daily

# Or via API
curl -X POST http://localhost:3000/api/tasks/generate-daily \
  -H "Authorization: Bearer your-cron-api-key"
```

### Trigger Weekly Task Generation

```bash
# From host machine
docker exec resflow_app /app/scripts/cron-runner.sh weekly

# Or via API
curl -X POST http://localhost:3000/api/tasks/generate-weekly \
  -H "Authorization: Bearer your-cron-api-key"
```

## Monitoring

### View Cron Logs

```bash
# Daily task logs
docker exec resflow_app tail -f /var/log/cron-daily.log

# Weekly task logs
docker exec resflow_app tail -f /var/log/cron-weekly.log

# Application logs
docker-compose logs -f app
```

### View Logs on Host Machine

Cron logs are persisted in a Docker volume and can be accessed:

```bash
# Find the volume
docker volume ls | grep cron_logs

# Inspect the volume
docker volume inspect resflow-v2_cron_logs
```

### Check Cron Service Status

```bash
# Check if cron daemon is running
docker exec resflow_app ps aux | grep cron

# Check cron logs from system
docker exec resflow_app cat /var/log/cron
```

## Production Configuration

### Security Best Practices

1. **Set Strong API Key**

   ```bash
   # Generate secure key
   CRON_API_KEY=$(openssl rand -hex 32)
   ```

2. **Use HTTPS in Production**

   ```bash
   BASE_URL=https://resflow.yourcompany.com
   ```

3. **Restrict Container Access**
   - Nginx handles external routing and SSL/TLS
   - Port 3000 is only accessible within Docker network

**Note:** Your existing nginx server will handle reverse proxy configuration. No additional nginx setup is needed in docker-compose.yml.

### Backup Cron Logs

Add to `scripts/crontab`:

```bash
# Backup logs weekly
0 1 * * 0 tar -czf /backups/cron-logs-$(date +\%Y\%m\%d).tar.gz /var/log/cron-*.log 2>&1
```

## Troubleshooting

### Cron Jobs Not Running

1. **Check cron daemon**

   ```bash
   docker exec resflow_app ps aux | grep cron
   ```

2. **Verify crontab installed**

   ```bash
   docker exec resflow_app crontab -l
   ```

3. **Check script permissions**

   ```bash
   docker exec resflow_app ls -la /app/scripts/cron-runner.sh
   ```

4. **Test script manually**
   ```bash
   docker exec resflow_app /app/scripts/cron-runner.sh daily
   ```

### Application Not Starting

1. **Check logs**

   ```bash
   docker-compose logs app
   ```

2. **Verify database connection**

   ```bash
   docker-compose logs db
   ```

3. **Check environment variables**
   ```bash
   docker exec resflow_app env | grep DATABASE_URL
   ```

### Logs Not Appearing

1. **Check log file permissions**

   ```bash
   docker exec resflow_app ls -la /var/log/cron-*.log
   ```

2. **Manually create logs**
   ```bash
   docker exec resflow_app touch /var/log/cron-daily.log /var/log/cron-weekly.log
   docker exec resflow_app chmod 666 /var/log/cron-*.log
   ```

## Maintenance Commands

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart only app
docker-compose restart app
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove images
docker rmi resflow-v2_app resflow-v2_db
```

### View Container Resource Usage

```bash
docker stats resflow_app resflow_db
```

## Support

For issues or questions:

1. Check logs: `docker-compose logs -f`
2. Verify configuration: Review `.env` file
3. Test manually: Run cron scripts directly
4. Check audit logs in database for task generation history
