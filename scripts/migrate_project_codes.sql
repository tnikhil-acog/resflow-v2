-- migrate_project_codes.sql
-- One-time migration for live DB.
-- Rule: projects with no client → "IN001" prefix (hardcoded, no DB record needed)
-- External clients → sequential CL001, CL002, ...

BEGIN;

-- 1. Backfill sequential CL codes for ALL existing clients (that have none yet)
WITH ranked AS (
  SELECT
    id,
    'CL' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at ASC)::text, 3, '0') AS new_code
  FROM clients
  WHERE client_code IS NULL
)
UPDATE clients
SET client_code = ranked.new_code
FROM ranked
WHERE clients.id = ranked.id;

-- 2. Preserve old project_code in project_master (so legacy codes are not lost)
UPDATE projects
SET project_master = project_code
WHERE project_master IS NULL OR project_master = '';

-- 3. Remap all project codes to new format: {ClientCode}-{YYYY}-{TypePrefix}{SeqNum}
--    No-client projects use 'IN001' directly (no DB record required).
WITH resolved AS (
  SELECT
    p.id,
    COALESCE(c.client_code, 'IN001')                                         AS client_code,
    EXTRACT(YEAR FROM COALESCE(p.started_on::date, p.created_at::date))::int AS yr,
    COALESCE(NULLIF(p.project_type, ''), 'O')                                AS type_prefix
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
),
ranked AS (
  SELECT
    id, client_code, yr, type_prefix,
    ROW_NUMBER() OVER (
      PARTITION BY client_code, yr, type_prefix
      ORDER BY id
    ) AS seq
  FROM resolved
)
UPDATE projects
SET project_code =
      ranked.client_code
      || '-' || ranked.yr::text
      || '-' || ranked.type_prefix
      || LPAD(ranked.seq::text, 3, '0')
FROM ranked
WHERE projects.id = ranked.id;

-- 4. Verify
SELECT project_code, project_master, project_type, status
FROM projects
ORDER BY project_code
LIMIT 25;

COMMIT;
