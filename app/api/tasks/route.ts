// POST /api/tasks/create
// Allowed Roles: project_manager, hr_executive
// Accept: { owner_id, entity_id, status, due_on }
// Validation:
//   - project_manager: Can create WHERE owner_id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)), else return 403 "Cannot assign tasks to non-team members"
//   - hr_executive: Can create for any owner_id
// INSERT into tasks table with assigned_by = current_user_id
// Return: { id, owner_id, entity_id, status, due_on, assigned_by, created_at }

// GET /api/tasks/list
// Allowed Roles: employee, project_manager, hr_executive
// Query params: owner_id, status, page, limit
// Data Filtering:
//   - employee: Returns WHERE owner_id = current_user_id
//   - project_manager: Returns WHERE owner_id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)) OR assigned_by = current_user_id
//   - hr_executive: Returns all tasks
// SELECT * FROM tasks WHERE filters applied
// JOIN employees table to get owner_name (full_name)
// Determine entity_type from entity_id lookup (check projects, employees, etc tables)
// Apply pagination using LIMIT and OFFSET
// Return: { tasks: [{ id, owner_id, owner_name, entity_id, entity_type, status, due_on, assigned_by, created_at }], total, page, limit }

// GET /api/tasks/get
// Allowed Roles: employee, project_manager, hr_executive
// Query param: id (required)
// Data Filtering:
//   - employee: Can view WHERE owner_id = current_user_id, else return 403
//   - project_manager: Can view WHERE owner_id IN team OR assigned_by = current_user_id, else return 403
//   - hr_executive: Can view any task
// SELECT * FROM tasks WHERE id = ?
// JOIN employees table to get owner_name (full_name)
// Determine entity_type from entity_id lookup
// Return: { id, owner_id, owner_name, entity_id, entity_type, status, due_on, assigned_by, created_at }
// Error 403 if access denied
// Error 404 if task not found

// PATCH /api/tasks/complete
// Allowed Roles: employee, project_manager, hr_executive
// Accept: { id }
// Get task: SELECT owner_id FROM tasks WHERE id = ?
// Validation:
//   - employee/project_manager: Can complete WHERE owner_id = current_user_id, else return 403 "Not your task"
//   - hr_executive: Can complete any task
// UPDATE tasks SET status = 'complete', completed_at = NOW() WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, status, completed_at }
// Error 403 if access denied
