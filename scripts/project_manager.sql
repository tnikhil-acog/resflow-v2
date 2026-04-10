BEGIN;

DROP TABLE IF EXISTS project_manager_staging;

CREATE TEMP TABLE project_manager_staging (
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

COPY project_manager_staging
FROM '/data/projects.csv'
DELIMITER ','
CSV HEADER;

-- project_code in CSV is now the new format — simple direct join
UPDATE projects p
SET project_manager_id = (
  SELECT e.id
  FROM employees e
  WHERE e.full_name ILIKE s.project_manager_name || '%'
    AND e.employee_role = 'PM'
  ORDER BY
    CASE WHEN e.full_name ILIKE s.project_manager_name || ' %' THEN 1 ELSE 2 END,
    length(e.full_name) ASC
  LIMIT 1
)
FROM project_manager_staging s
WHERE p.project_code = s.project_code
  AND NULLIF(trim(s.project_manager_name), '') IS NOT NULL
  AND p.project_manager_id IS NULL;

COMMIT;
