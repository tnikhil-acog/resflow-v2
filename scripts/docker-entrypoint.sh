#!/bin/bash

# Entrypoint script for ResFlow Docker container
# Handles both cron setup and application startup

set -e

echo "Starting ResFlow application with cron support..."

# Make cron runner executable
chmod +x /app/scripts/cron-runner.sh

# Install crontab if cron jobs file exists
if [ -f /app/scripts/crontab ]; then
    echo "Installing cron jobs..."
    crontab /app/scripts/crontab
    echo "Cron jobs installed successfully"
    crontab -l
fi

# Start cron daemon in background
echo "Starting cron daemon..."
cron

# Create log files with proper permissions
touch /var/log/cron-daily.log /var/log/cron-weekly.log
chmod 666 /var/log/cron-daily.log /var/log/cron-weekly.log

echo "Cron daemon started successfully"

# Start the Next.js application
echo "Starting Next.js application..."
exec "$@"
