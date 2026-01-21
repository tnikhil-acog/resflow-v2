// GET /api/departments/list
// Allowed Roles: employee, project_manager, hr_executive
// No query parameters
// SELECT * FROM departments
// Return: { departments: [{ id, name, designations }] }

// POST /api/departments/create
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { name, designations }
// Check name uniqueness: SELECT 1 FROM departments WHERE name = ?
// If exists, return 400 "Department name already exists"
// INSERT into departments table
// Return: { id, name, designations }
