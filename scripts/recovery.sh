#!/bin/bash
set -e

DB_CONTAINER="${DB_CONTAINER:-resflow-db}"
DB_USER="${DB_USER:-resflowuser}"
DB_NAME="${DB_NAME:-resflowdb}"
BACKUP_DIR="backups"
PSQL_FLAGS="-v ON_ERROR_STOP=1"

# Load environment variables (prefers .env, falls back to .env.local)
if [ -f .env ]; then
  # shellcheck disable=SC1091
  source .env
elif [ -f .env.local ]; then
  # shellcheck disable=SC1091
  source .env.local
fi

DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"

if [ -z "$DB_PASSWORD" ] && [ -n "$DATABASE_URL" ]; then
  DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's#^postgresql://[^:]*:\([^@]*\)@.*#\1#p')
fi

if [ -z "$DB_PASSWORD" ]; then
  echo "Error: Could not determine database password. Set POSTGRES_PASSWORD/DB_PASSWORD in .env or .env.local."
  exit 1
fi

escape_sql_literal() {
  echo "$1" | sed "s/'/''/g"
}

DB_PASSWORD_ESCAPED=$(escape_sql_literal "$DB_PASSWORD")

psql_target() {
  docker exec -e PGPASSWORD="$DB_PASSWORD" -i "$DB_CONTAINER" \
    psql $PSQL_FLAGS -U "$DB_USER" -d "$DB_NAME" "$@"
}

bootstrap_role_and_db() {
  local bootstrap_user="$1"
  local role_sql="DO \\$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD_ESCAPED'; ELSE ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD_ESCAPED'; END IF; END \\$\$;"

  docker exec -u postgres -i "$DB_CONTAINER" \
    psql $PSQL_FLAGS -U "$bootstrap_user" -d postgres -c "$role_sql" >/dev/null

  local db_exists
  db_exists=$(docker exec -u postgres -i "$DB_CONTAINER" \
    psql -U "$bootstrap_user" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';" | tr -d '[:space:]')

  if [ "$db_exists" != "1" ]; then
    docker exec -u postgres -i "$DB_CONTAINER" \
      psql $PSQL_FLAGS -U "$bootstrap_user" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" >/dev/null
  fi
}

ensure_db_access() {
  if psql_target -tAc "SELECT 1;" >/dev/null 2>&1; then
    return
  fi

  echo "Database auth failed for user '$DB_USER'. Attempting bootstrap..."

  if docker exec -u postgres -i "$DB_CONTAINER" psql -U postgres -d postgres -tAc "SELECT 1;" >/dev/null 2>&1; then
    bootstrap_role_and_db "postgres"
  elif docker exec -u postgres -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -tAc "SELECT 1;" >/dev/null 2>&1; then
    bootstrap_role_and_db "$DB_USER"
  else
    echo "Error: Unable to bootstrap database roles automatically."
    echo "Hint: If this is an old volume, recreate DB volume: docker-compose down -v && docker-compose up -d db"
    exit 1
  fi

  if ! psql_target -tAc "SELECT 1;" >/dev/null 2>&1; then
    echo "Error: Bootstrap completed, but login as '$DB_USER' still failed."
    exit 1
  fi
}

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "Error: Database container '$DB_CONTAINER' is not running"
  echo "Start it with: docker compose up -d db"
  exit 1
fi

ensure_db_access

# Check if backup file is provided
if [ -n "$1" ]; then
  BACKUP_FILE="$1"
  if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
  fi
  
  echo "Restoring from backup: $BACKUP_FILE"
  psql_target < "$BACKUP_FILE"
  echo "Restore completed!"
  exit 0
fi

# Ensure schema exists before fresh seed
SCHEMA_EXISTS=$(psql_target -tAc "SELECT to_regclass('public.employees') IS NOT NULL;" | tr -d '[:space:]')
if [ "$SCHEMA_EXISTS" != "t" ]; then
  LATEST_MIGRATION=$(ls -1 lib/db/migrations/*.sql 2>/dev/null | sort | tail -n 1)
  if [ -z "$LATEST_MIGRATION" ]; then
    echo "Error: No schema migration SQL found in lib/db/migrations/"
    exit 1
  fi

  echo "Schema not found. Applying migration: $LATEST_MIGRATION"
  psql_target < "$LATEST_MIGRATION"
  echo "Schema applied successfully"
fi

# Otherwise, do fresh seed from CSV
echo "No backup file provided. Performing fresh seed from CSV files..."

psql_target <<EOF
SET session_replication_role = 'replica';

TRUNCATE TABLE
  employees,
  attribute_values,
  attributes,
  audit_logs,
  clients,
  daily_project_logs,
  demand_skills,
  departments,
  employee_skills,
  phase,
  phase_report,
  project_allocation,
  projects,
  reports,
  resource_demands,
  skills,
  tasks
RESTART IDENTITY CASCADE;

SET session_replication_role = 'origin';

INSERT INTO employees (
  id, employee_code, ldap_username, full_name, email,
  employee_type, employee_role, employee_design, working_location,
  status, joined_on, created_at, updated_at
) VALUES (
  '03cef969-9b9f-4021-9d95-cb0845876da5', 'HR001', 'admin.hr',
  'System Admin', 'admin@aganitha.ai', 'FTE', 'HR', 'HR Director',
  'HQ', 'ACTIVE', '2026-01-21', NOW(), NOW()
);

EOF

FILES=(
  "import_sql.sql"
  "departments_insert.sql"
  "import_departments.sql"
  "import_skills.sql"
  "import_client.sql"
  "import_projects.sql"
  "project_manager.sql"
  "import_allocations.sql"
)

for file in "${FILES[@]}"; do
  echo "Running $file..."
  psql_target < "scripts/$file"
done

echo "Fresh seed completed!"