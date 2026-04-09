#!/bin/bash
set -e

DB_CONTAINER="resflow-db"
DB_USER="resflowuser"
DB_NAME="resflowdb"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

echo "Starting database backup..."

# Check if container is running
if ! docker ps | grep -q $DB_CONTAINER; then
  echo "Error: Database container '$DB_CONTAINER' is not running"
  exit 1
fi

# Create backups inside container
docker exec $DB_CONTAINER bash -c "mkdir -p /tmp/backups"

# Full database dump
echo "Creating full backup..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -f /tmp/backups/full_backup_$TIMESTAMP.sql

# Copy from container to host
docker cp $DB_CONTAINER:/tmp/backups/full_backup_$TIMESTAMP.sql $BACKUP_DIR/

# Data-only dump
echo "Creating data-only backup..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME \
  --data-only \
  --disable-triggers \
  --column-inserts \
  --exclude-table=employees \
  --exclude-table=departments \
  --exclude-table=skills \
  -f /tmp/backups/data_only_$TIMESTAMP.sql

docker cp $DB_CONTAINER:/tmp/backups/data_only_$TIMESTAMP.sql $BACKUP_DIR/

# Schema-only dump
echo "Creating schema backup..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME \
  --schema-only \
  -f /tmp/backups/schema_$TIMESTAMP.sql

docker cp $DB_CONTAINER:/tmp/backups/schema_$TIMESTAMP.sql $BACKUP_DIR/

# Cleanup inside container
docker exec $DB_CONTAINER rm -rf /tmp/backups

echo ""
echo "Backup completed successfully!"
echo "Location: $BACKUP_DIR/"
ls -lh $BACKUP_DIR/*_$TIMESTAMP.sql

# Keep only last 30 backups
echo ""
echo "Cleaning up old backups (keeping last 30)..."
find $BACKUP_DIR -name "full_backup_*.sql" -type f | sort -r | tail -n +31 | xargs -r rm
find $BACKUP_DIR -name "data_only_*.sql" -type f | sort -r | tail -n +31 | xargs -r rm
find $BACKUP_DIR -name "schema_*.sql" -type f | sort -r | tail -n +31 | xargs -r rm

echo "Done!"