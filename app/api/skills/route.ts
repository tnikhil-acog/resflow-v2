// POST /api/skills/create
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { skill_name, skill_department }
// Check skill_name uniqueness: SELECT 1 FROM skills WHERE skill_name = ?
// If exists, return 400 "skill_name already exists"
// INSERT into skills table
// Return: { skill_id, skill_name, skill_department, created_at }

// GET /api/skills/list
// Allowed Roles: employee, project_manager, hr_executive
// Query params: skill_department, page, limit
// SELECT * FROM skills WHERE filters applied
// Apply pagination using LIMIT and OFFSET
// Return: { skills: [{ skill_id, skill_name, skill_department, created_at }], total, page, limit }

// DELETE /api/skills/delete
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { skill_id }
// Check if skill is assigned: SELECT COUNT(*) FROM employee_skills WHERE skill_id = ?
// If count > 0, return 400 "Cannot delete skill. Assigned to X employees"
// DELETE FROM skills WHERE skill_id = ?
// INSERT audit log with operation='DELETE', changed_by=current_user_id
// Return: { message: "Skill deleted successfully" }

// POST /api/skills/request
// Allowed Roles: employee, project_manager, hr_executive
// Accept: { emp_id, skill_id, proficiency_level }
// Validation:
//   - employee/project_manager: Can request WHERE emp_id = current_user_id, else return 403
//   - hr_executive: Can request for any employee
// Check if already exists: SELECT 1 FROM employee_skills WHERE emp_id = ? AND skill_id = ?
// If exists, return 400 "Skill already requested or approved for this employee"
// INSERT INTO employee_skills (skill_id, emp_id, proficiency_level, approved_by, approved_at) VALUES (?, ?, ?, NULL, NULL)
// Return: { id, emp_id, skill_id, proficiency_level, status: 'PENDING', created_at }

// POST /api/skills/approve
// Allowed Roles: project_manager, hr_executive
// Accept: { employee_skill_id, action: "approve" | "reject" }
// Get employee_skill: SELECT emp_id, approved_by, approved_at FROM employee_skills WHERE id = employee_skill_id
// Validation:
//   - Status must be PENDING (approved_by IS NULL AND approved_at IS NULL), else return 400 "Skill already processed"
//   - project_manager: Can approve WHERE emp_id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)), else return 403 "Cannot approve skills for non-team members"
//   - hr_executive: Can approve for any employee
// If action = "approve":
//   - UPDATE employee_skills SET approved_by = current_user_id, approved_at = CURRENT_DATE WHERE id = employee_skill_id
//   - INSERT audit log with operation='UPDATE', changed_by=current_user_id
//   - Return: { id, emp_id, skill_id, proficiency_level, approved_by, approved_at, status: 'APPROVED' }
// If action = "reject":
//   - DELETE FROM employee_skills WHERE id = employee_skill_id
//   - INSERT audit log with operation='DELETE', changed_by=current_user_id
//   - Return: { message: "Skill request rejected" }
// Error 403 if access denied

// GET /api/skills/employee
// Allowed Roles: employee, project_manager, hr_executive
// Query param: emp_id (required)
// Data Filtering:
//   - employee: Can view WHERE emp_id = current_user_id, else return 403
//   - project_manager: Can view WHERE emp_id = current_user_id OR emp_id IN team, else return 403
//   - hr_executive: Can view any employee's skills
// SELECT * FROM employee_skills WHERE emp_id = ?
// JOIN skills table to get skill_name, skill_department
// Compute status: IF approved_by IS NULL AND approved_at IS NULL THEN 'PENDING' ELSE 'APPROVED'
// Return: { employee_skills: [{ id, emp_id, skill_id, skill_name, skill_department, proficiency_level, approved_by, approved_at, status }] }
// Error 403 if access denied
