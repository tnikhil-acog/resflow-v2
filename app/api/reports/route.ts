// POST /api/reports
// Roles: employee, project_manager, hr_executive
// Accept: { emp_id, report_type, report_date, content, weekly_hours? }
// Verify emp_id = current_user_id, else return 403
// Check duplicate: SELECT 1 FROM reports WHERE emp_id = ? AND report_date = ? AND report_type = ?
// If exists, return 400
// INSERT into reports table with weekly_hours as JSONB if provided
// Return: { report_id, emp_id, report_type, report_date, content, created_at }

// GET /api/reports (without query param ?id)
// Roles: employee, project_manager, hr_executive
// Query params: emp_id, report_type, start_date, end_date, page, limit
// If role = 'employee': SELECT * FROM reports WHERE emp_id = current_user_id
// If role = 'project_manager': SELECT * FROM reports WHERE emp_id IN (SELECT employee_id FROM project_allocations WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)) OR emp_id = current_user_id
// If role = 'hr_executive': SELECT * FROM reports (no filter)
// Apply additional query param filters and pagination
// JOIN employees table to get employee_code, employee_name
// Return: { reports: [...], total: count, page, limit }

// GET /api/reports?id=uuid
// Roles: employee, project_manager, hr_executive
// Query param: report_id (as id)
// Get report: SELECT * FROM reports WHERE report_id = ?
// If role = 'employee': verify emp_id = current_user_id, else return 403
// If role = 'project_manager': verify emp_id IN team members OR emp_id = current_user_id, else return 403
// If role = 'hr_executive': allow any report_id
// JOIN employees table to get employee_code, employee_name
// Return: { report_id, emp_id, employee_code, employee_name, report_type, report_date, content, weekly_hours, created_at }
// Error 404 if not found
