// POST /api/projects
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { project_code, project_name, client_name, short_description, long_description, pitch_deck_url, github_url, project_manager_id, priority, started_on }
// Check project_code uniqueness, return 400 if exists
// INSERT into projects table with status = 'Planning'
// INSERT audit log with operation='INSERT', changed_by=current_user_id
// Return: { id, project_code, project_name, status, created_at }

// GET /api/projects (without query param ?id)
// Roles: employee, project_manager, hr_executive
// Query params: status, project_manager_id, page, limit
// If role = 'employee': SELECT * FROM projects WHERE id IN (SELECT project_id FROM project_allocations WHERE employee_id = current_user_id)
// If role = 'project_manager': SELECT * FROM projects WHERE project_manager_id = current_user_id
// If role = 'hr_executive': SELECT * FROM projects (no filter)
// Apply additional query param filters and pagination
// Return: { projects: [...], total: count, page, limit }

// GET /api/projects?id=uuid
// Roles: employee, project_manager, hr_executive
// Query param: id
// If role = 'employee': verify id IN (SELECT project_id FROM project_allocations WHERE employee_id = current_user_id), else return 403
// If role = 'project_manager': verify project_manager_id = current_user_id, else return 403
// If role = 'hr_executive': allow any id
// SELECT * FROM projects WHERE id = ?
// Return: { id, project_code, project_name, client_name, short_description, long_description, pitch_deck_url, github_url, project_manager_id, priority, status, started_on, closed_on, created_at, updated_at }
// Error 404 if not found

// PUT /api/projects
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, project_name, client_name, short_description, long_description, pitch_deck_url, github_url, project_manager_id, priority, status }
// Do NOT allow updating project_code
// UPDATE projects SET fields WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, project_code, project_name, status, updated_at }

// DELETE /api/projects
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, closed_on }
// Check for active allocations: SELECT SUM(allocation_percentage) FROM project_allocations WHERE project_id = ? AND end_date > closed_on
// If sum > 0, return 400 with total allocation percentage
// UPDATE projects SET status = 'Closed', closed_on = ? WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, project_code, status, closed_on }
