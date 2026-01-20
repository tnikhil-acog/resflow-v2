// GET /api/approvals
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Query params: type, status, page, limit
// SELECT * FROM employee_skills WHERE approved_by IS NULL (pending approval)
// JOIN employees table to get employee_code, employee_name
// JOIN skills table to get skill_name
// Apply filters and pagination
// Return: { approvals: [{ id, type: 'skill', emp_id, employee_code, employee_name, skill_id, skill_name, proficiency_level, created_at }], total: count, page, limit }

// POST /api/approvals
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, type, action } where action = 'approve' or 'reject'
// If type = 'skill' AND action = 'approve': UPDATE employee_skills SET approved_by = current_user_id, approved_at = NOW() WHERE id = ?
// If type = 'skill' AND action = 'reject': DELETE FROM employee_skills WHERE id = ?
// INSERT audit log with operation='UPDATE' or 'DELETE', changed_by=current_user_id
// Return: { id, type, status: 'approved' or 'deleted', approved_by/deleted_at }
