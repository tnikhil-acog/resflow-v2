// POST /api/auth/login
// Allowed Roles: None (public)
// Accept: { ldap_username: string, password: string }
// Query employees table WHERE ldap_username = ? AND password hash matches
// Generate JWT with payload: { id, employee_code, ldap_username, employee_role, exp }
// Return: { token: string, user: { id, employee_code, ldap_username, full_name, email, employee_type, employee_role, employee_design, status } }
// Error 401 if credentials invalid

// POST /api/auth/logout
// Allowed Roles: employee, project_manager, hr_executive
// Extract JWT from Authorization header
// Invalidate token (add to blacklist table or clear client-side)
// Return: { message: "Logged out successfully" }
// Error 401 if invalid token

// GET /api/auth/me
// Allowed Roles: employee, project_manager, hr_executive
// Extract user id from JWT
// Query employees table WHERE id = current_user_id
// Return: { id, employee_code, ldap_username, full_name, email, employee_type, employee_role, employee_design, working_location, department_id, project_manager_id, experience_years, resume_url, college, degree, status, joined_on, exited_on }
// Error 401 if invalid token
// Error 404 if user not found
