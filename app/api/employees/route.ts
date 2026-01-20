// POST /api/employees
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { employee_code, full_name, email, employee_type, employee_role, role, working_location, department_id, project_manager_id, resume, college, degree, joined_on }
// Check employee_code uniqueness, return 400 if exists
// INSERT into employees table with status = 'Active'
// Return: { id, employee_code, full_name, email, role, status, created_at }

// GET /api/employees (without query param ?id)
// Role: employee, project_manager, hr_executive only
// Query params: status, department_id, role, page, limit
// SELECT * FROM employees WHERE filters applied
// Apply pagination using LIMIT and OFFSET
// Return: { employees: [...], total: count, page, limit }

// GET /api/employees?id=uuid
// Roles: employee, project_manager, hr_executive
// Query param: id
// If role = 'employee' OR 'project_manager': verify id = current_user_id, else return 403
// If role = 'hr_executive': allow any id
// SELECT * FROM employees WHERE id = ?
// Return: { id, employee_code, full_name, email, employee_type, employee_role, role, working_location, department_id, project_manager_id, resume, college, degree, status, joined_on, exited_on, created_at, updated_at }
// Error 404 if not found

// PUT /api/employees
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, full_name, employee_role, role, working_location, department_id, project_manager_id, resume, college, degree }
// Do NOT allow updating employee_code
// UPDATE employees SET fields WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, employee_code, full_name, employee_role, role, updated_at }

// DELETE /api/employees
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, exited_on }
// Check for active allocations: SELECT SUM(allocation_percentage) FROM project_allocations WHERE employee_id = ? AND end_date > exited_on
// If sum > 0, return 400 with total allocation percentage
// UPDATE employees SET status = 'Exited', exited_on = ? WHERE id = ?
// Cancel related tasks: UPDATE tasks SET status = 'cancelled' WHERE owner_id = ? AND status != 'complete'
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, employee_code, status, exited_on, tasks_cancelled: count }
