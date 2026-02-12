# ResFlow Scripts Directory

This directory contains utility scripts for the ResFlow application.

## Files

### `cron-runner.sh`

Main script that executes cron jobs inside the Docker container.

**Usage:**

```bash
# Run daily task generation
./cron-runner.sh daily

# Run weekly task generation
./cron-runner.sh weekly
```

**Environment Variables:**

- `BASE_URL` - Application base URL (default: http://localhost:3000)
- `CRON_API_KEY` - API key for cron endpoint authentication

### `crontab`

Cron schedule configuration file. Defines when automated tasks run.

**Default Schedule:**

- Daily log tasks: 9:00 AM every day
- Weekly report tasks: 9:00 AM every Monday

**Format:**

```
minute hour day month weekday command
```

### `docker-entrypoint.sh`

Docker container entrypoint script. Sets up cron daemon and starts the application.

**Features:**

- Installs cron jobs from `crontab`
- Starts cron daemon in background
- Creates log files
- Starts Next.js application

## Making Scripts Executable

```bash
chmod +x cron-runner.sh
chmod +x docker-entrypoint.sh
```

## Testing Locally (Outside Docker)

### Test Cron Runner Script

```bash
# Set environment variables
export BASE_URL=http://localhost:3000
export CRON_API_KEY=your-api-key

# Run daily tasks
./scripts/cron-runner.sh daily

# Run weekly tasks
./scripts/cron-runner.sh weekly
```

### Test Inside Docker Container

```bash
# Access container
docker exec -it resflow_app sh

# Run script manually
/app/scripts/cron-runner.sh daily
```

## Logs

Cron job output is logged to:

- `/var/log/cron-daily.log` - Daily task generation logs
- `/var/log/cron-weekly.log` - Weekly task generation logs

**View logs:**

```bash
# From host
docker exec resflow_app tail -f /var/log/cron-daily.log

# Inside container
tail -f /var/log/cron-daily.log
```

## Troubleshooting

### Script Not Executing

1. Check permissions:

   ```bash
   ls -la /app/scripts/
   ```

2. Ensure script has execute permission:

   ```bash
   chmod +x /app/scripts/cron-runner.sh
   ```

3. Check for line ending issues (if edited on Windows):
   ```bash
   dos2unix /app/scripts/cron-runner.sh
   ```

### Cron Jobs Not Running

1. Verify crontab is installed:

   ```bash
   docker exec resflow_app crontab -l
   ```

2. Check cron daemon is running:

   ```bash
   docker exec resflow_app ps aux | grep cron
   ```

3. Test script manually:
   ```bash
   docker exec resflow_app /app/scripts/cron-runner.sh daily
   ```

### Environment Variables Not Loading

Ensure environment variables are set in `docker-compose.yml`:

```yaml
environment:
  BASE_URL: ${BASE_URL:-http://localhost:3000}
  CRON_API_KEY: ${CRON_API_KEY:-}
```

## Customization

### Change Cron Schedule

Edit `scripts/crontab`:

```bash
# Run daily tasks at 8:30 AM instead of 9:00 AM
30 8 * * * /app/scripts/cron-runner.sh daily >> /var/log/cron-daily.log 2>&1
```

### Add New Cron Job

1. Add to `scripts/crontab`:

   ```bash
   # Clean old tasks at midnight
   0 0 * * * /app/scripts/cleanup-old-tasks.sh >> /var/log/cron-cleanup.log 2>&1
   ```

2. Create the script:

   ```bash
   touch scripts/cleanup-old-tasks.sh
   chmod +x scripts/cleanup-old-tasks.sh
   ```

3. Rebuild and restart:
   ```bash
   docker-compose restart app
   ```
