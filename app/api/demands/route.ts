// POST /api/demands/create
// Allowed Roles: project_manager, hr_executive
// Accept: { project_id, role_required, skills_required, start_date }
// Validation:
//   - project_manager: Can create WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id), else return 403 "Access denied. Not your project"
//   - hr_executive: Can create for any project
// INSERT into resource_demands table with requested_by = current_user_id, demand_status = 'REQUESTED'
// Return: { id, project_id, role_required, skills_required, start_date, requested_by, demand_status, created_at }

// GET /api/demands/list
// Allowed Roles: project_manager, hr_executive
// Query params: project_id, demand_status, requested_by, page, limit
// Data Filtering:
//   - project_manager: Returns WHERE requested_by = current_user_id
//   - hr_executive: Returns all demands
// SELECT * FROM resource_demands WHERE filters applied
// JOIN projects table to get project_code, project_name
// JOIN employees table to get requested_by_name (full_name)
// Parse skills_required comma-separated IDs and JOIN skills table to get skill names array
// Apply pagination using LIMIT and OFFSET
// Return: { demands: [{ id, project_id, project_code, project_name, role_required, skills_required, skill_names, start_date, requested_by, requested_by_name, demand_status, created_at }], total, page, limit }

// GET /api/demands/get
// Allowed Roles: project_manager, hr_executive
// Query param: id (required)
// Data Filtering:
//   - project_manager: Can view WHERE requested_by = current_user_id, else return 403
//   - hr_executive: Can view any demand
// SELECT * FROM resource_demands WHERE id = ?
// JOIN projects table to get project_code, project_name
// JOIN employees table to get requested_by_name (full_name)
// Parse skills_required comma-separated IDs and JOIN skills table to get skill names array
// Return: { id, project_id, project_code, project_name, role_required, skills_required, skill_names, start_date, requested_by, requested_by_name, demand_status, created_at }
// Error 403 if access denied
// Error 404 if demand not found

// PUT /api/demands/update
// Allowed Roles: project_manager (only if demand_status = 'REQUESTED')
// Accept: { id, role_required, skills_required, start_date }
// Get demand: SELECT requested_by, demand_status FROM resource_demands WHERE id = ?
// Validation:
//   - project_manager: Can update WHERE requested_by = current_user_id AND demand_status = 'REQUESTED', else return 403 "Cannot edit demand after HR review"
//   - demand_status must be 'REQUESTED', else return 400 "Cannot edit demand. Status: FULFILLED/CANCELLED"
// UPDATE resource_demands SET role_required = ?, skills_required = ?, start_date = ? WHERE id = ?
// Return: { id, role_required, skills_required, start_date }
// Error 403 if access denied

// POST /api/demands/approve
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, action: "approve" | "reject" }
// Get demand: SELECT id, demand_status FROM resource_demands WHERE id = ?
// If action = "approve":
//   - UPDATE resource_demands SET demand_status = 'FULFILLED' WHERE id = ?
// If action = "reject":
//   - UPDATE resource_demands SET demand_status = 'CANCELLED' WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, demand_status }
// Error 403 if access denied
