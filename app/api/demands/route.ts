// POST /api/demands
// Role: project_manager only
// Check JWT role = 'project_manager', else return 403
// Accept: { project_id, role_required, skills_required, start_date }
// Verify project_id ownership: SELECT 1 FROM projects WHERE id = ? AND project_manager_id = current_user_id
// If not found, return 403
// INSERT into resource_demands table with requested_by = current_user_id, status = 'Pending'
// Return: { id, project_id, project_code, role_required, skills_required, start_date, requested_by, status, created_at }

// GET /api/demands
// Roles: project_manager, hr_executive
// Query params: project_id, status, requested_by, page, limit
// If role = 'project_manager': SELECT * FROM resource_demands WHERE requested_by = current_user_id
// If role = 'hr_executive': SELECT * FROM resource_demands (no filter)
// Apply additional query param filters and pagination
// JOIN projects table to get project_code, project_name
// JOIN employees table to get requested_by_name
// Parse skills_required comma-separated IDs and JOIN skills table to get skill names array
// Return: { demands: [...], total: count, page, limit }
