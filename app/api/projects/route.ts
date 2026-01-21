// POST /api/projects/create
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { project_code, project_name, client_id, project_manager_id, started_on }
// Check project_code uniqueness, return 400 "project_code already exists" if exists
// INSERT into projects table with status = 'DRAFT'
// INSERT audit log with operation='INSERT', changed_by=current_user_id
// Return: { id, project_code, project_name, client_id, project_manager_id, status, started_on }

// GET /api/projects/list
// Allowed Roles: employee, project_manager, hr_executive
// Query params: status, project_manager_id, page, limit
// Data Filtering (all roles can view all projects in list):
//   - employee: Returns all projects
//   - project_manager: Returns all projects
//   - hr_executive: Returns all projects
// SELECT * FROM projects WHERE filters applied
// JOIN clients table to get client_name
// JOIN employees table to get project_manager_name
// Apply pagination using LIMIT and OFFSET
// Return: { projects: [{ id, project_code, project_name, client_id, client_name, project_manager_id, project_manager_name, status, started_on, closed_on }], total, page, limit }

// GET /api/projects/get
// Allowed Roles: employee, project_manager, hr_executive
// Query param: id (required)
// Data Filtering:
//   - employee: Can view WHERE id IN (SELECT project_id FROM project_allocation WHERE emp_id = current_user_id), else return 403
//   - project_manager: Can view WHERE project_manager_id = current_user_id, else return 403
//   - hr_executive: Can view any project
// SELECT * FROM projects WHERE id = ?
// JOIN clients table to get client_name
// JOIN employees table to get project_manager_name
// Return: { id, project_code, project_name, client_id, client_name, short_description, long_description, pitch_deck_url, github_url, project_manager_id, project_manager_name, status, started_on, closed_on }
// Error 403 if access denied
// Error 404 if project not found

// PUT /api/projects/update
// Allowed Roles: project_manager, hr_executive
// Accept (project_manager): { id, short_description, long_description, pitch_deck_url, github_url, status }
// Accept (hr_executive): { id, project_name, client_id, short_description, long_description, pitch_deck_url, github_url, project_manager_id, status, started_on }
// Validation (project_manager):
//   - Can update WHERE project_manager_id = current_user_id, else return 403 "Access denied. Not your project"
//   - Can update ONLY: short_description, long_description, pitch_deck_url, github_url, status
//   - Cannot update: project_code, project_name, client_id, project_manager_id, started_on
//   - If trying to update restricted fields, return 403 "Cannot update project_name. HR only"
//   - Status transitions allowed: DRAFT→ACTIVE, ACTIVE→ON_HOLD, ON_HOLD→ACTIVE
//   - Cannot transition to COMPLETED or CANCELLED, return 400 "Invalid status transition from DRAFT to COMPLETED"
// Validation (hr_executive):
//   - Can update all fields except project_code
//   - If trying to update project_code, return 400 "Cannot update project_code"
//   - All status transitions allowed
// UPDATE projects SET fields WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, project_code, project_name, status }

// POST /api/projects/close
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, status, closed_on }
// Validate: status must be 'COMPLETED' or 'CANCELLED', else return 400 "status must be COMPLETED or CANCELLED"
// Check for active allocations: SELECT COUNT(*) FROM project_allocation WHERE project_id = ? AND end_date > closed_on
// If count > 0, return 400 "Project has active allocations with end_date after closed_on"
// UPDATE projects SET status = ?, closed_on = ? WHERE id = ?
// End allocations: UPDATE project_allocation SET end_date = closed_on WHERE project_id = ? AND end_date > closed_on
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, project_code, status, closed_on, allocations_ended: count }

// GET /api/projects/status-transitions
// Allowed Roles: project_manager, hr_executive
// Query params: current_status, role
// Logic:
//   - If role = 'project_manager':
//     - DRAFT → ["ACTIVE"]
//     - ACTIVE → ["ON_HOLD"]
//     - ON_HOLD → ["ACTIVE"]
//   - If role = 'hr_executive':
//     - DRAFT → ["ACTIVE"]
//     - ACTIVE → ["ON_HOLD", "COMPLETED", "CANCELLED"]
//     - ON_HOLD → ["ACTIVE", "COMPLETED", "CANCELLED"]
// Return: { current_status, allowed_transitions: [...] }
