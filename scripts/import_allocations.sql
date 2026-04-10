BEGIN;

DROP TABLE IF EXISTS allocation_staging;

-- CSV headers: Date Allocated,EmpID,Name,ProjectID,Project Name,Project Type,Team,% Allocation,Period,Utilization,Billability,Availability
-- ProjectID column now contains new format codes (e.g. IN001-2026-B001, CL003-2026-C001)
CREATE TEMP TABLE allocation_staging (
  allocated_date     text,
  emp_code           text,
  emp_name           text,
  project_code       text,
  project_name       text,
  project_type       text,
  role               text,
  allocation_percent text,
  period             text,
  utilization        text,
  billability_text   text,
  availability       text
);

COPY allocation_staging
FROM '/data/allocation.csv'
DELIMITER ','
CSV HEADER;

INSERT INTO project_allocation (
  emp_id,
  project_id,
  role,
  allocation_percentage,
  start_date,
  end_date,
  utilization,
  billability,
  assigned_by
)
SELECT
  e.id,
  p.id,
  s.role,
  REPLACE(s.allocation_percent, '%', '')::decimal,
  COALESCE(
    date_trunc('month', (NULLIF(trim(s.period), '') || '-01')::date)::date,
    to_date(s.allocated_date, 'DD-Mon-YYYY')
  ),
  NULL,
  s.utilization,
  CASE s.billability_text
    WHEN 'BILLABLE'   THEN true
    WHEN 'UNBILLABLE' THEN false
    ELSE false
  END,
  hr.id
FROM allocation_staging s
JOIN employees  e  ON e.employee_code = s.emp_code
JOIN projects   p  ON p.project_code  = s.project_code
JOIN employees  hr ON hr.full_name    = 'Pooja Bonagiri';

COMMIT;
