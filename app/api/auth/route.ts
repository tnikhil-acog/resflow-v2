// POST /api/auth/login
// Public endpoint - no auth required
// Accept: { email: string, password: string }
// Query employees table WHERE email = ? AND password hash matches
// Generate JWT with payload: { id, employee_code, full_name, email, role }
// Return: { token: string, user: { id, employee_code, full_name, email, employee_type, employee_role, role, status } }
// Error 401 if credentials invalid

// POST /api/auth/logout
// Roles: employee, project_manager, hr_executive
// Extract JWT from Authorization header
// Invalidate token (add to blacklist table or clear client-side)
// Return: { message: "Logged out successfully" }
// Error 403 if no valid token

// GET /api/auth/me
// Roles: employee, project_manager, hr_executive
// Extract user id from JWT
// Query employees table WHERE id = current_user_id
// Return: { id, employee_code, full_name, email, employee_type, employee_role, role, working_location, department_id, project_manager_id, status, joined_on }
// Error 403 if no valid token
// Error 404 if user not found
