// POST /api/reports/create
// Allowed Roles: employee, project_manager, hr_executive
// Accept (Full-Time - WEEKLY): { emp_id, report_type: "WEEKLY", week_start_date, week_end_date, content, weekly_hours }
// Accept (Intern NOT on projects - DAILY): { emp_id, report_type: "DAILY", content }
// Validation:
//   - All roles: Can create WHERE emp_id = current_user_id, else return 403 "Access denied. Cannot create reports for other employees"
//   - Full-Time employees: report_type must be "WEEKLY"
//   - Interns on projects: report_type must be "WEEKLY"
//   - Interns NOT on projects: report_type must be "DAILY"
//   - report_date must be NULL on creation (DRAFT status)
// Check duplicate: SELECT 1 FROM reports WHERE emp_id = ? AND week_start_date = ? AND week_end_date = ? AND report_type = ?
// If exists, return 400 "Report already exists for this employee and date range"
// INSERT into reports table with weekly_hours as JSONB if provided, report_date = NULL
// Return: { id, emp_id, report_type, report_date, week_start_date, week_end_date, content, weekly_hours, created_at }

// GET /api/reports/list
// Allowed Roles: employee, project_manager, hr_executive
// Query params: emp_id, report_type, week_start_date, week_end_date, status, page, limit
// status parameter values:
//   - DRAFT: WHERE report_date IS NULL
//   - SUBMITTED: WHERE report_date IS NOT NULL
// Data Filtering:
//   - employee: Returns WHERE emp_id = current_user_id
//   - project_manager: Returns WHERE emp_id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)) OR emp_id = current_user_id
//   - hr_executive: Returns all reports
// SELECT * FROM reports WHERE filters applied
// JOIN employees table to get employee_code, employee_name (full_name)
// Compute status: IF report_date IS NULL THEN 'DRAFT' ELSE 'SUBMITTED'
// Apply pagination using LIMIT and OFFSET
// Return: { reports: [{ id, emp_id, employee_code, employee_name, report_type, report_date, week_start_date, week_end_date, content, weekly_hours, status, created_at }], total, page, limit }
// Error 403 if access denied

// GET /api/reports/get
// Allowed Roles: employee, project_manager, hr_executive
// Query param: id (required)
// Data Filtering:
//   - employee: Can view WHERE emp_id = current_user_id, else return 403
//   - project_manager: Can view WHERE emp_id IN team OR emp_id = current_user_id, else return 403
//   - hr_executive: Can view any report
// SELECT * FROM reports WHERE id = ?
// JOIN employees table to get employee_code, employee_name (full_name)
// Compute status: IF report_date IS NULL THEN 'DRAFT' ELSE 'SUBMITTED'
// Return: { id, emp_id, employee_code, employee_name, report_type, report_date, week_start_date, week_end_date, content, weekly_hours, status, created_at }
// Error 403 if access denied
// Error 404 if report not found

// PUT /api/reports/update
// Allowed Roles: employee, project_manager, hr_executive
// Accept: { id, content, weekly_hours, report_date }
// Get report: SELECT emp_id, report_date FROM reports WHERE id = ?
// Validation:
//   - If report_date IS NOT NULL (SUBMITTED):
//     - Only hr_executive can edit, else return 403 "Cannot edit submitted report"
//     - INSERT audit log with operation='UPDATE', changed_by=current_user_id
//   - If report_date IS NULL (DRAFT):
//     - employee/project_manager: Can edit WHERE emp_id = current_user_id, else return 403
//     - hr_executive: Can edit any
// If report_date is being set (submission):
//   - UPDATE reports SET report_date = CURRENT_DATE, content = ?, weekly_hours = ? WHERE id = ? AND report_date IS NULL
//   - Clear localStorage on frontend
// If updating existing report:
//   - UPDATE reports SET content = ?, weekly_hours = ? WHERE id = ?
// Return: { id, emp_id, report_type, report_date, content, weekly_hours, status }
// Error 403 if access denied
