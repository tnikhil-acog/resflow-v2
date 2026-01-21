// IMPORTANT: Daily work logs are NOT stored in the database!
// They are stored in browser localStorage only and aggregated into weekly_hours in Reports table.

// This route file is for FRONTEND REFERENCE ONLY - NO DATABASE OPERATIONS

// Frontend Implementation:
// Monday-Thursday: User enters daily hours on /logs page
//   - Store in localStorage: { date, project_code, hours, description }
//   - No API calls to backend
// Friday: User creates weekly report
//   - Aggregate localStorage entries into weekly_hours JSON: { "PR-001": 40, "PR-002": 10 }
//   - Submit to POST /api/reports/create with weekly_hours field
//   - Clear localStorage after successful submission

// GET /api/logs
// This endpoint is for viewing localStorage entries (frontend only)
// No database query needed
// Frontend should read from localStorage and display

// No POST /api/logs endpoint - use localStorage on frontend
// No PUT /api/logs endpoint - modify localStorage on frontend
// No DELETE /api/logs endpoint - remove from localStorage on frontend
