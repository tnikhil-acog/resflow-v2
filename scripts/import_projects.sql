BEGIN;

DROP TABLE IF EXISTS projects_staging;

CREATE TEMP TABLE projects_staging (
  project_code text,
  project_name text,
  client_name text,
  project_manager_name text,
  project_type text,
  project_master text,
  status_text text,
  economic_billability text,
  capacity_billability text
);

COPY projects_staging
FROM '/data/projects.csv'
DELIMITER ','
CSV HEADER;

INSERT INTO projects (
  project_code,
  project_name,
  client_id,
  project_manager_id,
  project_type,
  project_master,
  status,
  economic_billability,
  capacity_billability
)
SELECT
  s.project_code,
  s.project_name,

  -- client (nullable)
  c.id,

  -- manager (nullable now)
  e.id,

  s.project_type,
  s.project_master,

  CASE s.status_text
    WHEN 'Active' THEN 'ACTIVE'
    WHEN 'ACTIVE' THEN 'ACTIVE'
    WHEN 'Draft' THEN 'DRAFT'
    WHEN 'Retired' THEN 'COMPLETED'
    WHEN 'Cancelled' THEN 'CANCELLED'
    WHEN 'On Hold' THEN 'ON_HOLD'
    ELSE 'DRAFT'
  END::project_status,

  s.economic_billability::boolean,
  s.capacity_billability::boolean

FROM projects_staging s
LEFT JOIN clients c
  ON c.client_name = s.client_name
LEFT JOIN employees e
  ON e.full_name = s.project_manager_name;

COMMIT;
