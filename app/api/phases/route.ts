// POST /api/phases/create
// Allowed Roles: project_manager, hr_executive
// Accept: { project_id, phase_name, phase_description }
// Validation:
//   - project_manager: Can create WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id), else return 403 "Access denied. Not your project"
//   - hr_executive: Can create for any project
// INSERT into phase table
// Return: { id, project_id, phase_name, phase_description, created_at }

// GET /api/phases/list
// Allowed Roles: employee, project_manager, hr_executive
// Query param: project_id (required)
// Data Filtering:
//   - employee: Returns WHERE project_id IN (SELECT project_id FROM project_allocation WHERE emp_id = current_user_id), else return 403
//   - project_manager: Returns WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id), else return 403
//   - hr_executive: Returns all phases
// SELECT * FROM phase WHERE project_id = ?
// JOIN projects table to get project_code, project_name
// Return: { phases: [{ id, project_id, project_code, project_name, phase_name, phase_description, created_at }] }
// Error 403 if access denied

// PUT /api/phases/update
// Allowed Roles: project_manager, hr_executive
// Accept: { id, phase_name, phase_description }
// Validation:
//   - project_manager: Can update WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id), else return 403
//   - hr_executive: Can update any phase
// UPDATE phase SET phase_name = ?, phase_description = ? WHERE id = ?
// Return: { id, phase_name, phase_description }
// Error 403 if access denied

// POST /api/phase-reports/create
// Allowed Roles: project_manager, hr_executive
// Accept: { phase_id, content }
// Validation:
//   - project_manager: Can create WHERE phase_id IN (SELECT id FROM phase WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)), else return 403
//   - hr_executive: Can create for any phase
// INSERT into phase_report table with submitted_by = current_user_id, submitted_at = NOW()
// Return: { id, phase_id, content, submitted_by, submitted_at }
// Error 403 if access denied

// PUT /api/phase-reports/update
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, content }
// UPDATE phase_report SET content = ? WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, content, updated_at }
