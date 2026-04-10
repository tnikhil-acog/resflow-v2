BEGIN;

DROP TABLE IF EXISTS clients_staging;

-- Staging matches CSV structure
CREATE TEMP TABLE clients_staging (
  project_code         text,
  project_name         text,
  client_name          text,
  project_manager_name text,
  project_type         text,
  project_master       text,
  status_text          text,
  economic_billability text,
  capacity_billability text
);

COPY clients_staging
FROM '/data/projects.csv'
DELIMITER ','
CSV HEADER;

-- Insert distinct external clients with sequential CL codes.
-- No-client projects are handled as 'IN001' in code logic, no DB record needed.
INSERT INTO clients (client_name, client_code)
SELECT
  client_name,
  'CL' || LPAD(ROW_NUMBER() OVER (ORDER BY MIN(ctid))::text, 3, '0')
FROM clients_staging
WHERE client_name IS NOT NULL
  AND client_name <> ''
GROUP BY client_name
ON CONFLICT (client_name) DO NOTHING;

-- Patch projects.client_id for projects that have a client name
UPDATE projects p
SET client_id = c.id
FROM clients c
JOIN clients_staging s ON s.client_name = c.client_name
WHERE p.project_code = s.project_code;

COMMIT;
