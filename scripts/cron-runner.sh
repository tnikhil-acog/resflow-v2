#!/bin/bash

# Cron Job Runner Script for ResFlow Task Generation
# This script is executed by cron inside the Docker container

# Load environment variables if needed
if [ -f /app/.env ]; then
    export $(cat /app/.env | grep -v '^#' | xargs)
fi

# Set default values
BASE_URL=${BASE_URL:-"http://localhost:3000"}
CRON_API_KEY=${CRON_API_KEY:-""}

# Function to call API endpoint
call_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running $description..."
    
    if [ -n "$CRON_API_KEY" ]; then
        response=$(curl -s -X POST "${BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${CRON_API_KEY}" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -X POST "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json")
    fi
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Response: $response"
    echo "---"
}

# Check which task to run based on argument
case "$1" in
    daily)
        call_endpoint "/api/tasks/generate-daily" "Daily Log Tasks Generation"
        ;;
    weekly)
        call_endpoint "/api/tasks/generate-weekly" "Weekly Report Tasks Generation"
        ;;
    *)
        echo "Usage: $0 {daily|weekly}"
        exit 1
        ;;
esac
