// GET /api/clients/list
// Allowed Roles: employee, project_manager, hr_executive
// No query parameters
// SELECT * FROM clients
// Return: { clients: [{ id, client_name, created_at }] }

// POST /api/clients/create
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { client_name }
// Check client_name uniqueness: SELECT 1 FROM clients WHERE client_name = ?
// If exists, return 400 "client_name already exists"
// INSERT into clients table
// Return: { id, client_name, created_at }

// GET /api/clients/get
// Allowed Roles: employee, project_manager, hr_executive
// Query param: id (required)
// SELECT * FROM clients WHERE id = ?
// JOIN projects to get associated projects: SELECT id, project_code, project_name FROM projects WHERE client_id = ?
// Return: { id, client_name, created_at, projects: [{ id, project_code, project_name }] }
// Error 404 if client not found
