// GET /api/audit
// Role: hr_executive only
// Check JWT role = 'hr_executive', else return 403
// Query params: entity_type, entity_id, operation, changed_by, start_date, end_date, page, limit
// SELECT * FROM audit_logs WHERE filters applied
// JOIN employees table on changed_by to get changed_by_name
// Apply pagination
// Return: { audits: [{ id, entity_id, entity_type, row_id, operation, changed_by, changed_by_name, changed_at, changed_fields }], total: count, page, limit }

// POST /api/audit
// Internal endpoint called by other API routes after INSERT/UPDATE/DELETE
// Roles: employee, project_manager, hr_executive (but only called internally)
// Accept: { entity_id, row_id, operation, changed_fields }
// Extract changed_by from JWT (current_user_id)
// INSERT into audit_logs table with changed_by = current_user_id, changed_at = NOW()
// Return: { id, entity_id, row_id, operation, changed_by, changed_at }
