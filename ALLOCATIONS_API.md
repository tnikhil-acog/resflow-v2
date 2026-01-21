# Allocations API - Implementation Summary

## Overview

The allocations API has been fully implemented using **Drizzle ORM** with PostgreSQL. This implementation includes complete CRUD operations for project allocations with role-based access control, allocation percentage validation, and audit logging.

## Implemented Endpoints

### 1. POST /api/allocations (Create Allocation)

**Access:** hr_executive only

**Request Body:**

```json
{
  "emp_id": "uuid",
  "project_id": "uuid",
  "role": "string",
  "allocation_percentage": 50,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "billability": true,
  "is_critical_resource": false
}
```

**Features:**

- Validates end_date >= start_date
- Checks for overlapping allocations
- Ensures total allocation doesn't exceed 100%
- Creates audit log

### 2. GET /api/allocations (List Allocations)

**Access:** employee, project_manager, hr_executive

**Query Parameters:**

- `emp_id` - Filter by employee ID
- `project_id` - Filter by project ID
- `active_only` - Show only active allocations (boolean)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Role-based Filtering:**

- **employee**: Can only see their own allocations
- **project_manager**: Can see allocations for their projects
- **hr_executive**: Can see all allocations

**Response:**

```json
{
  "allocations": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### 3. PUT /api/allocations (Update Allocation)

**Access:** hr_executive only

**Request Body:**

```json
{
  "id": "uuid",
  "allocation_percentage": 60,
  "end_date": "2024-12-31",
  "billability": true,
  "is_critical_resource": false
}
```

**Features:**

- Validates new allocation percentage doesn't exceed 100%
- Considers other overlapping allocations
- Creates audit log

### 4. POST /api/allocations/transfer (Transfer Allocation)

**Access:** hr_executive only

**Request Body:**

```json
{
  "allocation_id": "uuid",
  "new_project_id": "uuid",
  "transfer_date": "2024-06-01"
}
```

**Features:**

- Validates transfer_date is within current allocation period
- Uses database transaction for atomicity
- Ends old allocation on transfer_date
- Creates new allocation starting from transfer_date
- Creates audit logs for both UPDATE and INSERT operations

## Technical Stack

### Database

- **ORM:** Drizzle ORM (v0.45.1)
- **Database:** PostgreSQL 16
- **Client:** pg (node-postgres)
- **Migrations:** Drizzle Kit

### Authentication

- **Library:** jose (v6.1.3) - JWT for Next.js Edge runtime
- **Token Expiry:** 24 hours
- **Algorithm:** HS256

### Date Handling

- Dates are stored as PostgreSQL `DATE` type (YYYY-MM-DD format)
- Helper functions in `lib/date-utils.ts`:
  - `toDateString()` - Convert Date to YYYY-MM-DD
  - `fromDateString()` - Parse YYYY-MM-DD to Date

## Files Created/Modified

### Core Implementation

1. **app/api/allocations/route.ts** - Main CRUD endpoints (POST, GET, PUT)
2. **app/api/allocations/transfer/route.ts** - Transfer endpoint
3. **lib/db/schema.ts** - Complete database schema with Drizzle
4. **lib/db.ts** - Database connection and client
5. **lib/auth.ts** - JWT authentication utilities
6. **lib/audit.ts** - Audit logging helper
7. **lib/date-utils.ts** - Date conversion utilities

### Infrastructure

8. **docker-compose.yml** - Container orchestration
9. **Dockerfile.postgres** - PostgreSQL 16 with WAL logging
10. **drizzle.config.ts** - Drizzle Kit configuration
11. **.env.example** - Environment variables template

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start PostgreSQL (Docker)

```bash
docker-compose up -d db
```

### 4. Generate and Run Migrations

```bash
# Generate migration files from schema
pnpm drizzle-kit generate

# Push schema to database
pnpm drizzle-kit push
```

### 5. Start Development Server

```bash
pnpm dev
```

## Database Schema

### project_allocation Table

```sql
CREATE TABLE project_allocation (
  id UUID PRIMARY KEY,
  emp_id UUID NOT NULL,
  project_id UUID NOT NULL,
  role VARCHAR(100) NOT NULL,
  allocation_percentage DECIMAL(5,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  billability BOOLEAN NOT NULL DEFAULT true,
  is_critical_resource BOOLEAN NOT NULL DEFAULT false,
  assigned_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## API Usage Examples

### Create Allocation

```bash
curl -X POST http://localhost:3000/api/allocations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emp_id": "...",
    "project_id": "...",
    "role": "Developer",
    "allocation_percentage": 50,
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  }'
```

### List Allocations

```bash
curl -X GET "http://localhost:3000/api/allocations?active_only=true&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Allocation

```bash
curl -X PUT http://localhost:3000/api/allocations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "...",
    "allocation_percentage": 60,
    "end_date": "2024-12-31"
  }'
```

### Transfer Allocation

```bash
curl -X POST http://localhost:3000/api/allocations/transfer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allocation_id": "...",
    "new_project_id": "...",
    "transfer_date": "2024-06-01"
  }'
```

## Validation Rules

1. **Allocation Percentage:**
   - Must be between 0 and 100
   - Total allocation for an employee cannot exceed 100% for overlapping periods

2. **Date Validation:**
   - end_date must be >= start_date
   - transfer_date must be between start_date and end_date

3. **Authorization:**
   - Only hr_executive can create, update, or transfer allocations
   - Employees can only view their own allocations
   - Project managers can view allocations for their projects

## Audit Trail

All operations (INSERT, UPDATE) are logged to the `audit_logs` table with:

- Entity type: "ALLOCATION"
- Entity ID: allocation UUID
- Operation: INSERT, UPDATE
- Changed by: User ID
- Changed at: Timestamp
- Changed fields: JSON object with modified data

## Next Steps

1. Run migrations to create database tables
2. Seed initial data (employees, projects, departments)
3. Test all endpoints with proper JWT tokens
4. Implement remaining API routes (employees, projects, demands, etc.)
5. Add comprehensive test coverage
6. Implement frontend components

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation errors)
- **403** - Forbidden (access denied)
- **404** - Not Found
- **500** - Internal Server Error

## Notes

- The implementation uses Drizzle ORM transactions for the transfer endpoint to ensure atomicity
- Date strings are automatically converted using helper functions
- JWT tokens expire after 24 hours
- Database uses PostgreSQL date type for proper date comparisons
