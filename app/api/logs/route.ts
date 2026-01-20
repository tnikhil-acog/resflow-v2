// POST /api/logs
// Roles: employee, project_manager, hr_executive
// Accept: { emp_id, project_code, date, hours, description }
// Verify emp_id = current_user_id, else return 403
// Verify employee allocated to project on date: SELECT 1 FROM project_allocations pa JOIN projects p ON pa.project_id = p.id WHERE pa.employee_id = ? AND p.project_code = ? AND pa.start_date <= ? AND pa.end_date >= ?
// If not allocated, return 400
// INSERT into reports table with report_type = 'daily', content = "project_code: hours - description"
// Return: { report_id, emp_id, report_type, report_date, content, created_at }

// GET /api/logs
// Roles: employee, project_manager, hr_executive
// Query params: emp_id, project_code, start_date, end_date, page, limit
// If role = 'employee': SELECT * FROM reports WHERE emp_id = current_user_id AND report_type = 'daily'
// If role = 'project_manager': SELECT * FROM reports WHERE emp_id IN (SELECT employee_id FROM project_allocations WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)) AND report_type = 'daily'
// If role = 'hr_executive': SELECT * FROM reports WHERE report_type = 'daily' (no filter)
// Apply additional query param filters and pagination
// JOIN employees table to include employee_code, employee_name
// Return: { logs: [...], total: count, page, limit }

// PUT /api/logs
// Roles: employee, project_manager, hr_executive
// Accept: { report_id, hours, description }
// Get log: SELECT emp_id, content FROM reports WHERE report_id = ?
// If role = 'employee' OR 'project_manager': verify emp_id = current_user_id, else return 403
// If role = 'hr_executive': allow any emp_id
// Parse existing content to extract project_code
// UPDATE reports SET content = "project_code: hours - description" WHERE report_id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { report_id, emp_id, report_date, content, updated_at }
