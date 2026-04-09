BEGIN;

DROP TABLE IF EXISTS clients_staging;

-- staging must match CSV structure
CREATE TEMP TABLE clients_staging (
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

COPY clients_staging
FROM '/data/projects.csv'
DELIMITER ','
CSV HEADER;

-- insert only distinct client names
INSERT INTO clients (client_name)
SELECT DISTINCT client_name
FROM clients_staging
WHERE client_name IS NOT NULL
  AND client_name <> ''
ON CONFLICT (client_name) DO NOTHING;

UPDATE projects p
SET client_id = c.id
FROM clients c
JOIN clients_staging s
  ON s.client_name = c.client_name
WHERE p.project_code = s.project_code;

COMMIT;
