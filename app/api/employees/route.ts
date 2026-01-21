// POST /api/employees/create
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { employee_code, ldap_username, full_name, email, employee_type, employee_role, employee_design, working_location, department_id, project_manager_id, experience_years, resume_url, college, degree, joined_on }
// Check employee_code uniqueness, return 400 "employee_code already exists" if exists
// Check ldap_username uniqueness, return 400 "ldap_username already exists" if exists
// INSERT into employees table with status = 'ACTIVE'
// Return: { id, employee_code, ldap_username, full_name, email, status, joined_on }

// GET /api/employees/list
// Allowed Roles: employee, project_manager, hr_executive
// Query params: status, department_id, page, limit
// Data Filtering:
//   - employee: Returns list with ONLY (id, employee_code, full_name, email, employee_design)
//   - project_manager: Returns list with ONLY (id, employee_code, full_name, email, employee_design)
//   - hr_executive: Returns full data (all fields)
// SELECT * FROM employees WHERE filters applied
// Apply pagination using LIMIT and OFFSET
// Return (employee/project_manager): { employees: [{ id, employee_code, full_name, email, employee_design }], total, page, limit }
// Return (hr_executive): { employees: [{ id, employee_code, ldap_username, full_name, email, employee_type, employee_role, employee_design, working_location, department_id, project_manager_id, status, joined_on, exited_on }], total, page, limit }

// GET /api/employees/get
// Allowed Roles: employee, project_manager, hr_executive
// Query param: id (required)
// Data Filtering:
//   - employee: Can view WHERE id = current_user_id, else return 403
//   - project_manager: Can view WHERE id = current_user_id OR id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)), else return 403
//   - hr_executive: Can view any employee
// SELECT * FROM employees WHERE id = ?
// Return: { id, employee_code, ldap_username, full_name, email, employee_type, employee_role, employee_design, working_location, department_id, project_manager_id, experience_years, resume_url, college, degree, status, joined_on, exited_on }
// Error 403 if access denied
// Error 404 if employee not found

// PUT /api/employees/update
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, full_name, email, employee_type, employee_role, employee_design, working_location, department_id, project_manager_id, experience_years, resume_url, college, degree }
// Do NOT allow updating employee_code (return 400 "Cannot update employee_code")
// Do NOT allow updating ldap_username (return 400 "Cannot update ldap_username")
// UPDATE employees SET fields WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, employee_code, full_name, email, employee_design }

// POST /api/employees/exit
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, exited_on }
// Validate: exited_on must be >= joined_on, else return 400 "exited_on must be >= joined_on"
// Check for active allocations: SELECT COUNT(*) FROM project_allocation WHERE emp_id = ? AND end_date > exited_on
// If count > 0, return 400 "Employee has active allocations with end_date after exited_on"
// UPDATE employees SET status = 'EXITED', exited_on = ? WHERE id = ?
// End allocations: UPDATE project_allocation SET end_date = exited_on WHERE emp_id = ? AND end_date > exited_on
// Cancel related tasks: UPDATE tasks SET status = 'cancelled' WHERE owner_id = ? AND status != 'complete'
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, employee_code, status, exited_on, allocations_ended: count, tasks_cancelled: count }
