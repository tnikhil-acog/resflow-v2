# Automated Task Generation - Cron Setup Guide

This document explains how to set up automated task generation for the ResFlow system.

## Overview

The system includes two automated task generation endpoints:

1. **Daily Log Tasks** - `/api/tasks/generate-daily` (run daily)
2. **Weekly Report Tasks** - `/api/tasks/generate-weekly` (run weekly)

## API Endpoints

### 1. Generate Daily Log Tasks

**Endpoint:** `POST /api/tasks/generate-daily`
**Schedule:** Daily at 9:00 AM
**Purpose:** Creates daily work log reminder tasks for all active employees

### 2. Generate Weekly Report Tasks

**Endpoint:** `POST /api/tasks/generate-weekly`
**Schedule:** Weekly on Monday at 9:00 AM
**Purpose:** Creates weekly report submission tasks for employees with active allocations

## Security

Both endpoints support optional API key authentication. Set the `CRON_API_KEY` environment variable:

```bash
CRON_API_KEY=your-secure-random-key-here
```

Then include it in requests:

```bash
Authorization: Bearer your-secure-random-key-here
```

## Setup Options

### Option 1: Using Vercel Cron Jobs

If deployed on Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/tasks/generate-daily",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/tasks/generate-weekly",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### Option 2: Using External Cron Service

Use services like cron-job.org, EasyCron, or AWS EventBridge:

**Daily Task:**

```bash
curl -X POST https://your-domain.com/api/tasks/generate-daily \
  -H "Authorization: Bearer ${CRON_API_KEY}"
```

**Weekly Task:**

```bash
curl -X POST https://your-domain.com/api/tasks/generate-weekly \
  -H "Authorization: Bearer ${CRON_API_KEY}"
```

### Option 3: Using System Crontab

Add to your system's crontab (`crontab -e`):

```bash
# Daily log tasks at 9 AM
0 9 * * * curl -X POST https://your-domain.com/api/tasks/generate-daily -H "Authorization: Bearer ${CRON_API_KEY}"

# Weekly report tasks every Monday at 9 AM
0 9 * * 1 curl -X POST https://your-domain.com/api/tasks/generate-weekly -H "Authorization: Bearer ${CRON_API_KEY}"
```

### Option 4: Using Node.js Cron (node-cron)

Install package:

```bash
npm install node-cron
```

Create `scripts/cron-jobs.ts`:

```typescript
import cron from "node-cron";

const CRON_API_KEY = process.env.CRON_API_KEY;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Daily log tasks at 9 AM
cron.schedule("0 9 * * *", async () => {
  console.log("Running daily task generation...");
  const response = await fetch(`${BASE_URL}/api/tasks/generate-daily`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CRON_API_KEY}`,
    },
  });
  const data = await response.json();
  console.log("Daily tasks result:", data);
});

// Weekly report tasks every Monday at 9 AM
cron.schedule("0 9 * * 1", async () => {
  console.log("Running weekly task generation...");
  const response = await fetch(`${BASE_URL}/api/tasks/generate-weekly`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CRON_API_KEY}`,
    },
  });
  const data = await response.json();
  console.log("Weekly tasks result:", data);
});

console.log("Cron jobs started successfully");
```

## Manual Testing

You can manually trigger task generation:

```bash
# Test daily tasks
curl -X POST http://localhost:3000/api/tasks/generate-daily \
  -H "Authorization: Bearer ${CRON_API_KEY}"

# Test weekly tasks
curl -X POST http://localhost:3000/api/tasks/generate-weekly \
  -H "Authorization: Bearer ${CRON_API_KEY}"
```

## Task Behavior

### Daily Log Tasks

- Created for all active employees
- Due date: Today
- Entity type: DAILY_PROJECT_LOG
- Skips creation if task already exists for the day
- Auto-completed when employee logs work for the day

### Weekly Report Tasks

- Created for employees with active project allocations
- Due date: End of week (Friday)
- Entity type: REPORT
- Skips creation if task already exists for the week
- Auto-completed when employee submits weekly report

## Monitoring

Check the audit logs to monitor task generation:

```sql
SELECT * FROM audit_logs
WHERE entity_type = 'TASK'
AND entity_id LIKE 'system-%generation'
ORDER BY changed_at DESC;
```

## Troubleshooting

1. **Tasks not being created**: Check cron job logs and ensure the endpoint is accessible
2. **Duplicate tasks**: The system prevents duplicates, but check the skip count in responses
3. **Authentication errors**: Verify CRON_API_KEY is set correctly in environment variables
