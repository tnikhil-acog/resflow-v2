BEGIN;

DROP TABLE IF EXISTS emp_dept_staging;

-- Staging table must match CSV shape (only columns we care about need names)
CREATE TEMP TABLE emp_dept_staging (
  employee_code text,
  full_name text,
  email text,
  joined_on text,
  year_of_joining text,
  gender text,
  employee_type text,
  working_location text,
  employee_design text,
  department_name text,
  experience_years text,
  college text,
  educational_stream text,
  reporting_manager text,
  ldap_username text,
  employee_role text,
  resume_url text,
  status text,
  exited_on text
);

-- Load full CSV
COPY emp_dept_staging
FROM '/data/users.csv'
DELIMITER ','
CSV HEADER;

-- Update employees.department_id using department name
UPDATE employees e
SET department_id = d.id
FROM departments d
JOIN emp_dept_staging s
  ON s.department_name = d.name
WHERE e.employee_code = s.employee_code
  AND e.department_id IS NULL;

COMMIT;
