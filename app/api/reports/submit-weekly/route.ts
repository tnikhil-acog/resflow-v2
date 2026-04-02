// POST /api/reports/submit-weekly
// Allowed Roles: employee, project_manager, hr_executive
// Accept: { content }
// Validation:
//   - Submission allowed only Monday–Friday (not weekends)
//   - Submission blocked after Friday 23:59
//   - Only one report per employee per week
// System assigns automatically:
//   - week_start_date: Monday of current week (calculated)
//   - week_end_date: Friday of current week (calculated)
//   - weekly_hours: Aggregated from daily_project_logs table
// Check duplicate: SELECT 1 FROM reports WHERE emp_id = current_user_id AND week_start_date = ? AND week_end_date = ?
// If exists, return 400 "Report already submitted for this week"
// Transaction:
//   1. Aggregate weekly_hours from daily_project_logs:
//      SELECT project_id, SUM(hours) FROM daily_project_logs
//      WHERE emp_id = current_user_id AND log_date BETWEEN week_start_date AND week_end_date AND locked = false
//      GROUP BY project_id
//   2. Convert to JSONB format with project codes: { "PR-001": 40, "PR-002": 10 }
//   3. INSERT into reports table with:
//      - emp_id = current_user_id
//      - report_type = 'WEEKLY'
//      - week_start_date = Monday of current week
//      - week_end_date = Friday of current week
//      - content = provided content
//      - weekly_hours = aggregated JSONB
//      - report_date = CURRENT_DATE (marks as SUBMITTED)
//   4. Lock corresponding daily logs: UPDATE daily_project_logs SET locked = true WHERE emp_id = current_user_id AND log_date BETWEEN week_start_date AND week_end_date
// Return: { id, week_start_date, week_end_date, weekly_hours }
// Error 400 if duplicate or validation fails
