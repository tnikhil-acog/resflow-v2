# Dashboard Analytics Requirements - Technical Analysis

## Current System State

### Existing APIs

1. `/api/dashboard/metrics` - GET - Returns role-based metrics
2. `/api/logs` - GET - Returns daily project logs with filtering
3. `/api/reports` - GET/POST - Weekly/daily reports management
4. `/api/allocations` - GET - Project allocations with billability flag
5. `/api/employees` - GET - Employee data with status
6. `/api/projects` - GET - Project data with client info
7. `/api/approvals` - GET/POST - Skill and demand approvals

### Existing Database Fields

- `daily_project_logs.hours` (decimal) - Individual log entries
- `project_allocation.billability` (boolean) - Whether allocation is billable
- `employees.status` (ACTIVE/INACTIVE/EXITED)
- `projects.status` (DRAFT/ACTIVE/ON_HOLD/COMPLETED/CANCELLED)
- `reports.report_type` (DAILY/WEEKLY)
- `reports.week_start_date`, `reports.week_end_date`

---

## HR/Admin Dashboard Requirements

### Metric 1: Number of Users

**Current Status**: EXISTS  
**API**: `/api/employees?status=ACTIVE`  
**Implementation**: Count employees where `status = 'ACTIVE'`  
**Data Available**: Yes - `employees` table has status field  
**Missing**: Need separate counts for ACTIVE vs INACTIVE employees

### Metric 2: Timesheet Data (Completed/Pending)

**Current Status**: PARTIALLY EXISTS  
**API Needed**: New endpoint `/api/dashboard/timesheets/status`  
**Logic Required**:

- Completed: Count employees who submitted weekly report for current week
  - Query: `SELECT COUNT(DISTINCT emp_id) FROM reports WHERE report_type='WEEKLY' AND week_start_date = current_week_start`
- Pending: Total active employees - Completed
  - Query: `SELECT COUNT(*) FROM employees WHERE status='ACTIVE'` minus completed count
    **Data Available**: Yes - `reports` table tracks submissions  
    **Gap**: No direct "8 hours per day" validation logic in database

### Metric 3: Billable Hours (Weekly)

**Current Status**: CALCULATION EXISTS, API NEEDED  
**API Needed**: New endpoint `/api/dashboard/hours/billable`  
**Implementation**: Calculate on-the-fly from existing data  
**Logic Required**:

```sql
SELECT SUM(dpl.hours) as billable_hours
FROM daily_project_logs dpl
JOIN project_allocation pa ON dpl.project_id = pa.project_id AND dpl.emp_id = pa.emp_id
WHERE pa.billability = true
AND dpl.log_date BETWEEN week_start AND week_end
```

**Data Available**: Yes - `daily_project_logs.hours` + `project_allocation.billability`  
**Implementation**: Real-time calculation from daily logs and allocation table

### Metric 4: Non-Billable Hours (Weekly)

**Current Status**: CALCULATION EXISTS, API NEEDED  
**API Needed**: Same endpoint as Metric 3 - `/api/dashboard/hours/billable`  
**Implementation**: Calculate on-the-fly from existing data  
**Logic Required**:

```sql
SELECT SUM(dpl.hours) as non_billable_hours
FROM daily_project_logs dpl
JOIN project_allocation pa ON dpl.project_id = pa.project_id AND dpl.emp_id = pa.emp_id
WHERE pa.billability = false
AND dpl.log_date BETWEEN week_start AND week_end
```

**Data Available**: Yes - same tables as billable hours  
**Implementation**: Real-time calculation, return both billable and non-billable in single response

### Metric 5: Notifications

**Current Status**: CLARIFICATION NEEDED  
**Tables**: `tasks` table exists with due_on and status  
**Potential Notification Sources**:

- Overdue reports: Employees with no weekly report for current week
- Pending approvals: Count from `employee_skills WHERE approved_by IS NULL` + `resource_demands WHERE demand_status='REQUESTED'`
- Due tasks: Count from `tasks WHERE status='DUE' AND due_on <= today+3`

**Implementation Options**:

1. **In-App Notifications**: Add notifications table with columns: `id, user_id, type, message, related_id, read, created_at`
2. **Email Notifications**: Integrate email service (SendGrid, AWS SES, Nodemailer)
3. **Push Notifications**: Browser push API or Firebase Cloud Messaging
4. **Notification Preferences**: User settings for notification types

**Data Available**: Partial - tasks and approvals exist but no dedicated notifications infrastructure  
**Action Required**: Need clarification on:

- Notification delivery method (in-app, email, push, or all)
- User preference controls needed
- Real-time vs batch notifications
- Notification retention policy

**Recommendation**: Start with in-app notifications table + badge counts, add email later

---

## Project Details Requirements

### Metric 6: Number of Projects

**Current Status**: EXISTS  
**API**: `/api/projects` with count  
**Filters Needed**:

- Active projects: `status IN ('ACTIVE', 'ON_HOLD')`
- Completed: `status = 'COMPLETED'`
- Cancelled: `status = 'CANCELLED'`
  **Data Available**: Yes

### Metric 7: Client Projects

**Current Status**: EXISTS  
**Database**: `projects.client_id` (references clients table), `projects.project_type`  
**Definition**: Project is a client project if:

- `project_type = 'C'` OR
- `client_id IS NOT NULL`

**Query**:

```sql
SELECT COUNT(*) FROM projects
WHERE (project_type = 'C' OR client_id IS NOT NULL)
AND status = 'ACTIVE'
```

**Data Available**: Yes

### Metric 8: Internal Projects (Non-Client)

**Current Status**: EXISTS  
**Definition**: Project is internal/sub-project if:

- `project_type != 'C'` AND
- `client_id IS NULL`

**Query**:

```sql
SELECT COUNT(*) FROM projects
WHERE (project_type != 'C' OR project_type IS NULL)
AND client_id IS NULL
AND status = 'ACTIVE'
```

**Data Available**: Yes  
**Note**: No parent-child project relationship in schema - all projects are flat hierarchy

### Metric 9: Monthly Billing Hours

**Current Status**: CALCULATION EXISTS, API NEEDED  
**API Needed**: New endpoint `/api/dashboard/billing/monthly`  
**Implementation**: Calculate on-the-fly from existing data  
**Query Required**:

```sql
SELECT p.project_code, p.project_name, SUM(dpl.hours) as total_billable_hours
FROM daily_project_logs dpl
JOIN project_allocation pa ON dpl.project_id = pa.project_id AND dpl.emp_id = pa.emp_id
JOIN projects p ON dpl.project_id = p.id
WHERE pa.billability = true
AND EXTRACT(MONTH FROM dpl.log_date) = target_month
AND EXTRACT(YEAR FROM dpl.log_date) = target_year
GROUP BY p.id, p.project_code, p.project_name
ORDER BY p.project_code
```

**Data Available**: Yes - `daily_project_logs.hours` + `project_allocation.billability`  
**Implementation**: Real-time calculation, no aggregated storage needed

---

## Employee Management Requirements

### Metric 10: Inactive Users Visibility

**Current Status**: EXISTS  
**API**: `/api/employees?status=INACTIVE` or `/api/employees?status=EXITED`  
**Data Available**: Yes - `employees.status` has INACTIVE and EXITED values

### Metric 11: Employee Details (Department, Project)

**Current Status**: PARTIALLY EXISTS  
**API**: `/api/employees/{id}` returns department_id  
**What's Available**:

- Department: `employees.department_id` → `departments.department_name`
- Current Projects: Join through `project_allocation` where `end_date IS NULL OR end_date >= today`
  **What's Missing**:
- No direct "currently working on" summary in employee list view
- Need aggregated query to show all current projects per employee

### Metric 12: Billable/Non-Billable Employee Details

**Current Status**: DOES NOT EXIST  
**What's Needed**:

- Per employee: Show % of time allocated to billable vs non-billable projects
- Calculation: Sum allocation_percentage where billability=true vs false
  **Query Required**:

```sql
SELECT emp_id,
  SUM(CASE WHEN billability=true THEN allocation_percentage ELSE 0 END) as billable_pct,
  SUM(CASE WHEN billability=false THEN allocation_percentage ELSE 0 END) as non_billable_pct
FROM project_allocation
WHERE (end_date IS NULL OR end_date >= CURRENT_DATE)
GROUP BY emp_id
```

**Data Available**: Yes  
**Gap**: No API endpoint for this aggregation

### Metric 13: Per-Project Customizations

**Current Status**: CLARIFICATION NEEDED  
**User Requirement**: "Allow per-project or business-specific customizations (columns, fields, task types, validations)"  
**Current Schema**: Fixed schema, no custom fields support  
**Available Option**: Task categorization can use `tasks.entity_type` field  
**Action Required**: More explanation needed from HR on specific customization requirements  
**Recommendation**: No development until requirements are clarified

### Metric 14: Auto-Categorize Tasks

**Current Status**: NOT APPLICABLE  
**Original Requirement**: "Auto-categorize tasks based on keywords (list of task types)"  
**Current Schema**: `tasks.description` is text, no categorization  
**Available Alternative**: Use existing `tasks.entity_type` field for task categorization  
**Values in entity_type**:

- `DAILY_PROJECT_LOG` - Daily work log tasks
- `WEEKLY_REPORT_SUBMISSION` - Weekly report tasks
- Other types as needed

**Recommendation**: Use entity_type for filtering/grouping tasks instead of keyword-based categorization

### Metric 15: Editable Employee Details

**Current Status**: EXISTS  
**API**: PUT `/api/employees` with role check (HR only)  
**Data Available**: Yes - employees table is fully editable by HR

---

## Employee Timesheet/Reports Requirements

### Metric 16: Project-Wise Consolidated Data

**Current Status**: PARTIALLY EXISTS  
**API**: `/api/logs` with project_id filter  
**What's Available**:

- Can filter logs by project_id, emp_id, date range
- Returns individual log entries
  **What's Missing**:
- No aggregated view in single API call
- Need new endpoint: `/api/reports/consolidated` that returns:

```json
{
  "project_code": "PR-001",
  "project_name": "Project Alpha",
  "employees": [
    {
      "employee_code": "EMP001",
      "full_name": "John Doe",
      "total_hours": 160,
      "billable": true
    }
  ],
  "total_project_hours": 320
}
```

### Metric 17: Monthly Consolidated Reports

**Current Status**: DOES NOT EXIST  
**API Needed**: New endpoint `/api/reports/monthly`  
**Query Needed**:

```sql
SELECT emp_id, e.employee_code, e.full_name,
       p.project_code, p.project_name,
       SUM(hours) as total_hours,
       pa.billability
FROM daily_project_logs dpl
JOIN employees e ON dpl.emp_id = e.id
JOIN projects p ON dpl.project_id = p.id
JOIN project_allocation pa ON dpl.emp_id = pa.emp_id AND dpl.project_id = pa.project_id
WHERE EXTRACT(MONTH FROM log_date) = target_month
AND EXTRACT(YEAR FROM log_date) = target_year
GROUP BY emp_id, project_id, pa.billability
ORDER BY e.employee_code, p.project_code
```

**Data Available**: Yes  
**Gap**: No monthly aggregation API, no CSV/Excel export

### Metric 18: Reports Display Full Name + Employee ID

**Current Status**: EXISTS  
**Data Available**: `employees.full_name` and `employees.employee_code`  
**Current Implementation**: Reports page shows both fields  
**Status**: Already implemented

---

## Manager Dashboard Requirements

### Metric 19: Summary of Total Hours Logged by Team

**Current Status**: PARTIALLY EXISTS  
**API**: `/api/dashboard/metrics` returns `weeklyHours` for PM  
**What's Available**: Current week hours for PM's own team  
**What's Missing**:

- Individual breakdown per team member
- Comparison week-over-week
- Historical data for past 4 weeks

### Metric 20: Number of Pending Timesheets

**Current Status**: EXISTS  
**API**: `/api/dashboard/metrics` returns `missingReports` for PM  
**Logic**: Counts team members who haven't submitted weekly report  
**Status**: Already implemented

### Metric 21: Weekly/Monthly Team Productivity Charts

**Current Status**: DOES NOT EXIST  
**API Needed**: New endpoint `/api/dashboard/team/productivity`  
**Data Needed**:

- Weekly hours per team member for last 8 weeks
- Hours breakdown by project
- Billable vs non-billable hours trend
  **Query Pattern**:

```sql
SELECT week_start_date, emp_id, SUM(hours) as weekly_hours
FROM daily_project_logs
WHERE emp_id IN (team_member_ids)
AND log_date >= (CURRENT_DATE - INTERVAL '8 weeks')
GROUP BY week_start_date, emp_id
```

**Gap**: No charting data API, no trend analysis

---

## Manager - Manage Reportees Requirements

### Metric 22: Access Individual and Team Timesheets

**Current Status**: EXISTS  
**API**: `/api/logs` with emp_id parameter  
**Access Control**: PM can query logs for team members on their projects  
**Status**: Already implemented

### Metric 23: Daily/Weekly/Monthly View Filters

**Current Status**: PARTIALLY EXISTS  
**API**: `/api/logs?start_date=X&end_date=Y`  
**What Works**: Can filter by date range  
**What's Missing**:

- No pre-defined "this week" / "this month" shortcuts in API
- No grouped view (need to aggregate client-side)

### Metric 24: Filters by Project, Employee, Dates

**Current Status**: EXISTS  
**API**: `/api/logs?project_id=X&emp_id=Y&start_date=Z&end_date=W`  
**Status**: Fully implemented

---

## Manager - Approve/Reject Requirements

### Metric 25: Bulk Approval

**Current Status**: DOES NOT EXIST  
**Current API**: `/api/approvals` POST accepts single approval at a time  
**What's Needed**: Accept array of approval IDs

```json
{
  "approvals": [
    { "id": "skill-123", "type": "skill", "action": "approve" },
    { "id": "demand-456", "type": "demand", "action": "approve" }
  ]
}
```

**Gap**: No bulk operation support

### Metric 26: Status (Pending, Approved, Rejected)

**Current Status**: EXISTS  
**Database**:

- Skills: `approved_by IS NULL` = Pending, `approved_by NOT NULL` = Approved
- Demands: `demand_status` = REQUESTED/APPROVED/REJECTED
  **API**: `/api/approvals` filters by status  
  **Status**: Implemented

### Metric 27: Reminders

**Current Status**: DOES NOT EXIST  
**What's Needed**:

- Email/notification for pending approvals > 3 days old
- Dashboard badge count for pending approvals
  **Current**: `tasks` table exists but no automated reminder system  
  **Gap**: No email service integration, no scheduled job system

---

## Employee Dashboard Requirements

### Metric 28: Summary of Total Hours Worked (Week)

**Current Status**: EXISTS  
**API**: `/api/dashboard/metrics` returns `weeklyHours`  
**Status**: Already implemented

### Metric 29: Timesheet Details - Clarification Needed

**Original Requirement**: "Update the details Project wise or sub project specific"  
**Current Status**: PARTIALLY EXISTS  
**API**: `/api/logs` POST accepts project_id  
**What Works**: Can log hours per project  
**What's Missing**: No sub-project concept in schema - projects are flat hierarchy  
**Action Required**: Need clarification from HR on:

- What defines a "sub-project"?
- Is this parent-child project relationship or something else?
- Should employees see sub-projects separately when logging hours?

**Recommendation**: No development until sub-project requirements are clarified

### Metric 30: Billable/Non-Billable Indicator

**Current Status**: DATA EXISTS, UI UPDATE NEEDED  
**Database**: Billability is stored in `project_allocation.billability` (boolean)  
**Implementation**: When employee logs hours, JOIN to project_allocation to show billable indicator  
**Query**:

```sql
SELECT pa.billability
FROM project_allocation pa
WHERE pa.emp_id = ? AND pa.project_id = ?
AND (pa.end_date IS NULL OR pa.end_date >= CURRENT_DATE)
```

**Action Required**: Update `/api/logs` response to include billability flag  
**Frontend**: Display "Billable" or "Non-Billable" badge in log entry UI

### Metric 31: Bulk Log Updates - Clarification Needed

**Current Status**: BULK SUBMISSION EXISTS  
**API**: POST `/api/logs` with `{logs: [{...}, {...}]}`  
**What Works**: Can submit multiple log entries at once  
**Action Required**: Need clarification from HR on "Update details in bulk":

- Does this mean editing multiple existing logs at once?
- Or submitting multiple new logs (already implemented)?
- What specific bulk operations are needed?

**Recommendation**: If bulk edit is needed, create new endpoint PUT `/api/logs/bulk` accepting array of log IDs and updates

### Metric 32: Task Dropdowns/Templates

**Current Status**: AUTO-GENERATION EXISTS, TEMPLATES CLARIFICATION NEEDED  
**Existing Auto-Generated Tasks**:

1. Daily work log tasks - Generated every day at 9 AM with `entity_type='DAILY_PROJECT_LOG'`
2. Weekly report tasks - Generated every Monday with `entity_type='WEEKLY_REPORT_SUBMISSION'`

**Action Required**: Need clarification from HR on:

- What additional templates are needed beyond auto-generated tasks?
- Should there be predefined task descriptions for common work activities?
- Examples of "frequently performed tasks" that need templates?

**Current Implementation**: Tasks are auto-created, users fill in `notes` field with free-form text  
**Recommendation**: No development until specific template requirements are clarified

### Metric 33: Delete Timesheet Entries

**Current Status**: DELETED FUNCTIONALITY, RE-ENABLE NEEDED  
**Current Implementation**: Delete functionality completely removed from UI and API  
**Database**: `daily_project_logs.locked` field exists (boolean) - intended to prevent edits after submission  
**User Requirement**: "Employees should have the option to delete their own timesheet entries if required until it is submitted"

**Implementation Plan**:

1. Re-enable DELETE endpoint at `/api/logs/[id]` with conditions:
   - Check `log.emp_id === user.id` (owner only)
   - Check `log.locked === false` (not submitted/locked)
   - Return error if locked: "Cannot delete submitted timesheet entry"
2. Update frontend `/app/(pages)/logs/page.tsx`:
   - Show delete button only when: `user.id === log.emp_id AND !log.locked`
   - Add confirmation dialog
3. Add logic to set `locked = true` when weekly report is submitted

**SQL Check**:

```sql
DELETE FROM daily_project_logs
WHERE id = ? AND emp_id = ? AND locked = false
```

**Action Required**: Implement conditional delete based on locked status

### Metric 34: Reminders for Not Updated

**Current Status**: PARTIALLY EXISTS  
**What Exists**: `tasks` table with `entity_type='DAILY_PROJECT_LOG'` and `status='DUE'`  
**What's Missing**: No automated reminder emails, no browser notifications

---

## General System Requirements

### Requirement 35: Settings Navigation

**Status**: REMOVED - NOT RELATED TO METRICS/ANALYTICS  
**Original Issue**: "When clicked on settings it is difficult to go back"  
**Note**: This is UI/UX navigation issue, not dashboard analytics requirement  
**Action**: Removed from requirements document per user request

### Requirement 36: Holidays Management

**Status**: OUT OF SCOPE - NOT MANAGED IN SYSTEM  
**Original Requirement**: Mandatory and optional holidays with leave management  
**Decision**: Holidays are not managed in this system  
**Impact on Other Features**:

- Daily "8 hours" validation will NOT exclude holidays
- Monthly billing calculations will include all working days
- No holiday calendar integration

**Action**: Removed from requirements per user request

### Requirement 37: Data Export for HR

**Current Status**: DOES NOT EXIST  
**User Requirement**: "We need to give the functionality of exporting to HR, and they can export all kinds of data from there by selecting from a simple dropdown"

**Implementation Plan**:

1. **New Page**: `/app/(pages)/exports/page.tsx` (HR only access)
2. **UI Components**:
   - Dropdown to select data type:
     - Daily Work Logs
     - Weekly Reports
     - Monthly Consolidated Reports
     - Employee Allocations
     - Project Details
     - Billable Hours Summary
     - Approval History
   - Date range filters (start_date, end_date)
   - Format selector: CSV, Excel
   - Export button

3. **New API Routes**:
   - GET `/api/exports/logs?start_date=X&end_date=Y&format=csv`
   - GET `/api/exports/reports?start_date=X&end_date=Y&format=excel`
   - GET `/api/exports/allocations?format=csv`
   - GET `/api/exports/monthly-billing?month=1&year=2026&format=excel`

4. **Libraries Needed**:
   - CSV: Built-in Node.js (csv-stringify)
   - Excel: `exceljs` package

5. **Response Type**: Download file with proper headers
   ```typescript
   res.setHeader('Content-Type', 'text/csv' or 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
   ```

**Access Control**: Role check `checkRole(user, ["hr_executive"])`  
**Priority**: HIGH - Explicitly requested by user

---

## Summary: What Exists vs What's Needed

### FULLY IMPLEMENTED (8)

1. Number of active employees - `/api/employees?status=ACTIVE`
2. Pending timesheets count - `/api/dashboard/metrics` returns missingReports
3. Employee status filtering - `/api/employees?status=INACTIVE|EXITED`
4. Individual timesheet access - `/api/logs?emp_id=X`
5. Date range filtering - `/api/logs?start_date=X&end_date=Y`
6. Approval status tracking - `/api/approvals` with status filters
7. Weekly hours summary - `/api/dashboard/metrics` returns weeklyHours
8. Bulk log submission - POST `/api/logs` with array

### PARTIALLY IMPLEMENTED - NEEDS CLARIFICATION (7)

1. **Per-project customizations** - Need more details from HR on specific requirements
2. **Sub-project logging** - Need clarification on what defines a sub-project
3. **Bulk log updates** - Need clarification if this means edit or submission (submission exists)
4. **Task templates** - Need examples beyond auto-generated daily/weekly tasks
5. **Notifications system** - Need clarification on delivery method (in-app, email, push)
6. **Timesheet completion validation** - 8-hour validation not needed (holidays not managed)
7. **Team hours breakdown** - Partial data exists, need individual member detail

### READY TO IMPLEMENT (12)

1. **Billable hours calculation** - Data exists, need API endpoint
2. **Non-billable hours calculation** - Data exists, need API endpoint
3. **Client project count** - Logic defined: `project_type='C' OR client_id IS NOT NULL`
4. **Internal project count** - Logic defined: `project_type!='C' AND client_id IS NULL`
5. **Monthly billing hours** - Query ready, need API endpoint
6. **Billable/non-billable % per employee** - Query ready, need API endpoint
7. **Monthly consolidated reports** - Query ready, need API endpoint
8. **Team productivity charts** - Data exists, need aggregation endpoint
9. **Bulk approval operations** - Modify existing `/api/approvals` to accept array
10. **Billable indicator in logs** - Add JOIN to project_allocation in `/api/logs` response
11. **Delete logs (conditional)** - Re-enable with `locked=false` check
12. **HR Export functionality** - New page + API routes with CSV/Excel generation

### NOT IMPLEMENTED - OUT OF SCOPE (3)

1. **Settings navigation** - UI/UX issue, not analytics requirement (REMOVED)
2. **Holidays management** - Not managed in system per user decision (REMOVED)
3. **PDF export** - Only CSV and Excel requested by HR

### CRITICAL PRIORITIES (Top 5)

1. **Export functionality for HR** - HIGH - Explicitly requested, needs new page + 4 API routes
2. **Billable/Non-billable hours calculation** - HIGH - Core billing metric, affects multiple dashboards
3. **Monthly consolidated reports** - MEDIUM - Reduces manual work, query ready
4. **Delete logs (conditional)** - MEDIUM - User requirement to allow delete before submission
5. **Bulk approval** - MEDIUM - Improves PM workflow efficiency

### NEW API ENDPOINTS NEEDED (8)

1. GET `/api/dashboard/hours/billable?start_date=X&end_date=Y` - Returns billable and non-billable hours
2. GET `/api/dashboard/billing/monthly?month=X&year=Y` - Monthly billing by project
3. GET `/api/dashboard/team/productivity?start_date=X&end_date=Y` - Weekly productivity charts
4. GET `/api/reports/monthly?month=X&year=Y` - Monthly report aggregation
5. POST `/api/approvals/bulk` - Bulk approve/reject array of approvals
6. GET `/api/exports/logs?start_date=X&end_date=Y&format=csv|excel` - Export work logs
7. GET `/api/exports/reports?start_date=X&end_date=Y&format=csv|excel` - Export reports
8. GET `/api/exports/monthly-billing?month=X&year=Y&format=csv|excel` - Export monthly billing

### NEW DATABASE TABLES NEEDED (1)

1. `notifications` - If notification system is implemented (pending clarification)
   - Columns: id, user_id, type, message, related_id, read, created_at

### SCHEMA CONSTRAINTS

**Cannot modify existing schema** - User requirement  
**Can add new tables** - Allowed  
**Can add new routes** - Allowed  
**Changes must use existing columns** - All queries use current schema
