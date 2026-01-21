// GET /api/approvals/list
// Allowed Roles: project_manager, hr_executive
// Query params: type, page, limit
// type parameter values: "skills", "demands", "all" (default: "all")
// Data Filtering:
//   - project_manager:
//     - Skills: Returns pending skill requests WHERE emp_id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)) AND approved_by IS NULL
//     - Demands: No access (empty array)
//   - hr_executive:
//     - Skills: Returns all pending skill requests WHERE approved_by IS NULL
//     - Demands: Returns all demands WHERE demand_status = 'REQUESTED'
//
// For Skills:
//   - SELECT * FROM employee_skills WHERE approved_by IS NULL AND approved_at IS NULL (PENDING)
//   - JOIN employees table to get employee_code, employee_name (full_name)
//   - JOIN skills table to get skill_name, skill_department
// For Demands (hr_executive only):
//   - SELECT * FROM resource_demands WHERE demand_status = 'REQUESTED'
//   - JOIN projects table to get project_code, project_name
//   - JOIN employees table to get requested_by_name (full_name)
// Apply pagination using LIMIT and OFFSET
// Return: {
//   approvals: [
//     { id, type: "skill", emp_id, employee_code, employee_name, skill_id, skill_name, proficiency_level, created_at },
//     { id, type: "demand", project_id, project_code, project_name, role_required, skills_required, requested_by, requested_by_name, created_at }
//   ],
//   total, page, limit
// }

// POST /api/approvals/approve-skill
// Allowed Roles: project_manager, hr_executive
// Accept: { employee_skill_id, action: "approve" | "reject" }
// This is an alias for POST /api/skills/approve for convenience
// Redirect to skills approval logic
// See /api/skills/approve for full implementation

// POST /api/approvals/approve-demand
// Allowed Roles: hr_executive
// Accept: { demand_id, action: "approve" | "reject" }
// This is an alias for POST /api/demands/approve for convenience
// Redirect to demands approval logic
// See /api/demands/approve for full implementation
