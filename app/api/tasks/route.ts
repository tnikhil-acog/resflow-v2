// POST /api/tasks
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { owner_id, entity_id, status, due_on }
// INSERT into tasks table
// Return: { id, owner_id, entity_id, status, due_on, created_at }

// GET /api/tasks
// Roles: employee, project_manager, hr_executive
// Query params: owner_id, status, page, limit
// If role = 'employee' OR 'project_manager': SELECT * FROM tasks WHERE owner_id = current_user_id
// If role = 'hr_executive': SELECT * FROM tasks (no filter)
// Apply additional query param filters and pagination
// JOIN employees table to get owner_name
// Determine entity_type from entity_id lookup (check projects, employees, etc tables)
// Return: { tasks: [{ id, owner_id, owner_name, entity_id, entity_type, status, due_on, created_at }], total: count, page, limit }

// PATCH /api/tasks
// Roles: employee, project_manager, hr_executive
// Accept: { id }
// Get task: SELECT owner_id FROM tasks WHERE id = ?
// If role = 'employee' OR 'project_manager': verify owner_id = current_user_id, else return 403
// If role = 'hr_executive': allow any owner_id
// UPDATE tasks SET status = 'complete', completed_at = NOW() WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, status, completed_at }
