// GET /api/audit/list
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Query params: entity_type, entity_id, operation, changed_by, start_date, end_date, page, limit
// entity_type values: EMPLOYEE, PROJECT, ALLOCATION, REPORT, DEMAND, SKILL, TASK, etc.
// operation values: INSERT, UPDATE, DELETE
// SELECT * FROM audit_logs WHERE filters applied
// JOIN employees table on changed_by to get changed_by_name (full_name)
// Apply pagination using LIMIT and OFFSET
// Return: { audits: [{ id, entity_type, entity_id, row_id, operation, changed_by, changed_by_name, changed_at, changed_fields }], total, page, limit }

// POST /api/audit/log
// INTERNAL ENDPOINT - Called by other API routes after INSERT/UPDATE/DELETE
// Allowed Roles: employee, project_manager, hr_executive (but only called internally by backend)
// Accept: { entity_type, entity_id, row_id, operation, changed_fields }
// Extract changed_by from JWT (current_user_id)
// INSERT into audit_logs table with changed_by = current_user_id, changed_at = NOW()
// Return: { id, entity_type, entity_id, row_id, operation, changed_by, changed_at }
// Note: This endpoint should not be exposed to frontend - only for internal backend use
