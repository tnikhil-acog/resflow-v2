// POST /api/logs/daily
// Allowed Roles: employee, project_manager, hr_executive
// Accept: { project_id, log_date, hours, notes }
// Validation:
//   - hours must be decimal(4,2) format, > 0
//   - log_date must be within current work week (Monday–Friday)
//   - log_date cannot be future
//   - log_date cannot be locked (already submitted in weekly report)
//   - Check if project exists
//   - Check if log already exists for (emp_id, project_id, log_date)
//   - Check if locked: SELECT locked FROM daily_project_logs WHERE emp_id = ? AND project_id = ? AND log_date = ?
//   - If locked = true, return 400 "Cannot modify locked logs. Already submitted in weekly report"
// Transaction (INSERT or UPDATE):
//   - If log exists and not locked: UPDATE daily_project_logs SET hours = ?, notes = ? WHERE emp_id = ? AND project_id = ? AND log_date = ?
//   - If log doesn't exist: INSERT into daily_project_logs with emp_id = current_user_id, locked = false
// Return: { id, log_date, hours }

// GET /api/logs/daily
// Allowed Roles: employee, project_manager, hr_executive
// Query params: current_week=true (optional), emp_id (optional), start_date (optional), end_date (optional)
// current_week=true: Automatically filters for Monday to current date of current week
// Data Filtering:
//   - employee: Returns WHERE emp_id = current_user_id
//   - project_manager: Can query own logs or team members in their projects
//   - hr_executive: Can query any employee logs
// SELECT * FROM daily_project_logs WHERE filters applied
// JOIN projects table to get project_code, project_name
// Return: { logs: [{ project_id, project_code, log_date, hours, notes }] }
