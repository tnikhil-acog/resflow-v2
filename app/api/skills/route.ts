// POST /api/skills
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { skill_name, skill_department }
// Check skill_name uniqueness: SELECT 1 FROM skills WHERE skill_name = ?
// If exists, return 400
// INSERT into skills table
// Return: { skill_id, skill_name, skill_department, created_at }

// GET /api/skills
// Roles: employee, project_manager, hr_executive
// Query params: skill_department, page, limit
// SELECT * FROM skills WHERE filters applied
// Apply pagination
// Return: { skills: [{ skill_id, skill_name, skill_department, created_at }], total: count, page, limit }

// PUT /api/skills
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { employee_skill_id }
// UPDATE employee_skills SET approved_by = current_user_id, approved_at = NOW() WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, emp_id, skill_id, proficiency_level, approved_by, approved_at }

// DELETE /api/skills
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { skill_id }
// Check if skill is assigned: SELECT COUNT(*) FROM employee_skills WHERE skill_id = ?
// If count > 0, return 400 with count
// DELETE FROM skills WHERE skill_id = ?
// INSERT audit log with operation='DELETE', changed_by=current_user_id
// Return: { message: "Skill deleted successfully" }
