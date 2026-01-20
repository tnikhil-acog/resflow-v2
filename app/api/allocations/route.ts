// POST /api/allocations
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { employee_id, project_id, role, allocation_percentage, start_date, end_date, billability, is_critical_resource }
// Calculate total allocation: SELECT SUM(allocation_percentage) FROM project_allocations WHERE employee_id = ? AND end_date >= start_date AND start_date <= end_date
// If total + allocation_percentage > 100, return 400 with current and requested percentages
// INSERT into project_allocations table
// INSERT audit log with operation='INSERT', changed_by=current_user_id
// Return: { id, employee_id, project_id, role, allocation_percentage, start_date, end_date, billability, created_at }

// GET /api/allocations
// Roles: employee, project_manager, hr_executive
// Query params: employee_id, project_id, active_only, page, limit
// If role = 'employee': SELECT * FROM project_allocations WHERE employee_id = current_user_id
// If role = 'project_manager': SELECT * FROM project_allocations WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)
// If role = 'hr_executive': SELECT * FROM project_allocations (no filter)
// Apply additional query param filters and pagination
// JOIN employees and projects tables to include employee_code, employee_name, project_code, project_name
// Return: { allocations: [...], total: count, page, limit }

// PUT /api/allocations
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, allocation_percentage, end_date, billability, is_critical_resource }
// Get current allocation: SELECT employee_id, allocation_percentage, start_date, end_date FROM project_allocations WHERE id = ?
// Calculate total excluding this allocation: SELECT SUM(allocation_percentage) FROM project_allocations WHERE employee_id = ? AND id != ? AND end_date >= start_date AND start_date <= end_date
// If total + new_allocation_percentage > 100, return 400
// UPDATE project_allocations SET fields WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, allocation_percentage, end_date, billability, is_critical_resource, updated_at }

// PATCH /api/allocations
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Accept: { allocation_id, new_project_id, transfer_date }
// Get old allocation: SELECT * FROM project_allocations WHERE id = allocation_id
// UPDATE old allocation SET end_date = transfer_date WHERE id = allocation_id
// INSERT new allocation with same employee_id, role, allocation_percentage, billability, is_critical_resource but project_id = new_project_id, start_date = transfer_date
// INSERT audit logs for both UPDATE and INSERT operations with changed_by=current_user_id
// Return: { old_allocation: { id, end_date }, new_allocation: { id, employee_id, project_id, role, allocation_percentage, start_date, end_date, billability, is_critical_resource, created_at } }
