# Dashboard Analytics - Implementation Phases

## Overview

This document outlines the phased implementation plan for dashboard analytics and reporting enhancements. Features are organized by priority and dependencies to ensure systematic delivery.

---

## Phase 1: Core Metrics & Billability Tracking

**Priority**: HIGH  
**Duration**: 2-3 weeks  
**Dependencies**: None - uses existing schema

### Objectives

- Enable billable/non-billable hours tracking
- Add project classification metrics
- Show billability indicators in employee workflows

### Features

#### 1.1 Billable Hours API

- **Endpoint**: GET `/api/dashboard/hours/billable`
- **Query Parameters**: `start_date`, `end_date`, `emp_id` (optional)
- **Response**:
  ```json
  {
    "billable_hours": 120.5,
    "non_billable_hours": 39.5,
    "total_hours": 160,
    "period": { "start": "2026-01-01", "end": "2026-01-31" }
  }
  ```
- **Query**:
  ```sql
  SELECT
    SUM(CASE WHEN pa.billability = true THEN dpl.hours ELSE 0 END) as billable_hours,
    SUM(CASE WHEN pa.billability = false THEN dpl.hours ELSE 0 END) as non_billable_hours
  FROM daily_project_logs dpl
  JOIN project_allocation pa ON dpl.project_id = pa.project_id AND dpl.emp_id = pa.emp_id
  WHERE dpl.log_date BETWEEN ? AND ?
  ```

#### 1.2 Project Classification Metrics

- **Endpoint**: GET `/api/dashboard/projects/classification`
- **Response**:
  ```json
  {
    "client_projects": 15,
    "internal_projects": 8,
    "total_active": 23
  }
  ```
- **Logic**:
  - Client: `project_type = 'C' OR client_id IS NOT NULL`
  - Internal: `project_type != 'C' AND client_id IS NULL`

#### 1.3 Billability Indicator in Logs

- **Modify**: GET `/api/logs` response
- **Add Field**: `billability` (boolean) - JOIN from `project_allocation`
- **Frontend**: Display "Billable" or "Non-Billable" badge in work log entries
- **Files**:
  - `/app/api/logs/route.ts` - Add JOIN to project_allocation
  - `/app/(pages)/logs/page.tsx` - Add badge component

#### 1.4 Employee Billability Breakdown

- **Endpoint**: GET `/api/employees/[id]/billability`
- **Response**:
  ```json
  {
    "employee_id": "emp-123",
    "billable_percentage": 60,
    "non_billable_percentage": 40,
    "allocations": [
      {
        "project_code": "PR-001",
        "allocation_percentage": 60,
        "billability": true
      }
    ]
  }
  ```
- **Query**:
  ```sql
  SELECT
    SUM(CASE WHEN billability=true THEN allocation_percentage ELSE 0 END) as billable_pct,
    SUM(CASE WHEN billability=false THEN allocation_percentage ELSE 0 END) as non_billable_pct
  FROM project_allocation
  WHERE emp_id = ? AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ```

### Deliverables

- 3 new API endpoints
- 1 modified API endpoint (logs)
- Frontend badge components
- Employee details page update

---

## Phase 2: Monthly Reporting & Consolidation

**Priority**: HIGH  
**Duration**: 2-3 weeks  
**Dependencies**: Phase 1 (billability tracking)

### Objectives

- Enable monthly billing calculations
- Provide consolidated reports by project and employee
- Support historical trend analysis

### Features

#### 2.1 Monthly Billing Hours

- **Endpoint**: GET `/api/dashboard/billing/monthly`
- **Query Parameters**: `month` (1-12), `year`, `project_id` (optional)
- **Response**:
  ```json
  {
    "month": 1,
    "year": 2026,
    "projects": [
      {
        "project_code": "PR-001",
        "project_name": "Project Alpha",
        "total_billable_hours": 320.5,
        "total_employees": 4
      }
    ],
    "total_billable_hours": 1240.5
  }
  ```
- **Query**:
  ```sql
  SELECT p.project_code, p.project_name, SUM(dpl.hours) as total_billable_hours, COUNT(DISTINCT dpl.emp_id) as total_employees
  FROM daily_project_logs dpl
  JOIN project_allocation pa ON dpl.project_id = pa.project_id AND dpl.emp_id = pa.emp_id
  JOIN projects p ON dpl.project_id = p.id
  WHERE pa.billability = true
  AND EXTRACT(MONTH FROM dpl.log_date) = ?
  AND EXTRACT(YEAR FROM dpl.log_date) = ?
  GROUP BY p.id, p.project_code, p.project_name
  ORDER BY p.project_code
  ```

#### 2.2 Monthly Consolidated Reports

- **Endpoint**: GET `/api/reports/monthly`
- **Query Parameters**: `month`, `year`, `project_id` (optional), `emp_id` (optional)
- **Response**:
  ```json
  {
    "month": 1,
    "year": 2026,
    "records": [
      {
        "employee_code": "EMP001",
        "full_name": "John Doe",
        "project_code": "PR-001",
        "project_name": "Project Alpha",
        "total_hours": 160,
        "billability": true
      }
    ]
  }
  ```
- **Query**:
  ```sql
  SELECT
    e.employee_code, e.full_name,
    p.project_code, p.project_name,
    SUM(dpl.hours) as total_hours,
    pa.billability
  FROM daily_project_logs dpl
  JOIN employees e ON dpl.emp_id = e.id
  JOIN projects p ON dpl.project_id = p.id
  JOIN project_allocation pa ON dpl.emp_id = pa.emp_id AND dpl.project_id = pa.project_id
  WHERE EXTRACT(MONTH FROM dpl.log_date) = ?
  AND EXTRACT(YEAR FROM dpl.log_date) = ?
  GROUP BY e.employee_code, e.full_name, p.project_code, p.project_name, pa.billability
  ORDER BY e.employee_code, p.project_code
  ```

#### 2.3 Team Productivity Charts

- **Endpoint**: GET `/api/dashboard/team/productivity`
- **Query Parameters**: `start_date`, `end_date`, `manager_id` (optional)
- **Response**:
  ```json
  {
    "weekly_data": [
      {
        "week_start": "2026-01-06",
        "week_end": "2026-01-12",
        "employees": [
          {
            "emp_id": "emp-123",
            "employee_code": "EMP001",
            "full_name": "John Doe",
            "total_hours": 40,
            "billable_hours": 32,
            "projects_count": 2
          }
        ]
      }
    ]
  }
  ```
- **Query**: Group daily logs by week, aggregate by employee
- **Frontend**: Chart component showing weekly hours trends

### Deliverables

- 3 new API endpoints
- Monthly reports page UI
- Team productivity charts component
- Dashboard widgets for HR/PM roles

---

## Phase 3: HR Export Functionality

**Priority**: HIGH  
**Duration**: 2 weeks  
**Dependencies**: Phase 2 (monthly reports)

### Objectives

- Enable HR to export all data types
- Support CSV and Excel formats
- Centralized export page with dropdown selection

### Features

#### 3.1 Export Page

- **Route**: `/app/(pages)/exports/page.tsx`
- **Access**: HR Executive only
- **UI Components**:
  - Data type dropdown:
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

#### 3.2 Export API Endpoints

- GET `/api/exports/logs?start_date=X&end_date=Y&format=csv|excel`
  - Exports all work logs with filters
  - Columns: Date, Employee Code, Employee Name, Project Code, Project Name, Hours, Notes, Billability
- GET `/api/exports/reports?start_date=X&end_date=Y&format=csv|excel`
  - Exports weekly reports
  - Columns: Week Start, Week End, Employee Code, Employee Name, Total Hours, Status
- GET `/api/exports/allocations?format=csv|excel`
  - Exports current allocations
  - Columns: Employee Code, Employee Name, Project Code, Project Name, Allocation %, Billability, Start Date, End Date
- GET `/api/exports/monthly-billing?month=X&year=Y&format=csv|excel`
  - Exports monthly billing summary
  - Columns: Project Code, Project Name, Total Billable Hours, Total Employees, Month, Year

#### 3.3 Implementation Details

- **Libraries**:
  - CSV: Built-in Node.js with `csv-stringify`
  - Excel: `exceljs` package
- **Response Headers**:

  ```typescript
  // CSV
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="logs_${start_date}_${end_date}.csv"`,
  );

  // Excel
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="logs_${start_date}_${end_date}.xlsx"`,
  );
  ```

- **Access Control**: `checkRole(user, ["hr_executive"])`

### Deliverables

- 1 new page (exports)
- 4 new API endpoints
- CSV/Excel generation utilities
- Install `exceljs` package

---

## Phase 4: Workflow Enhancements

**Priority**: MEDIUM  
**Duration**: 1-2 weeks  
**Dependencies**: None - independent features

### Objectives

- Improve PM approval workflow
- Allow employees to delete unsubmitted logs
- Add team member detail views for managers

### Features

#### 4.1 Bulk Approval Operations

- **Modify**: POST `/api/approvals/bulk`
- **Accept Array**:
  ```json
  {
    "approvals": [
      { "id": "skill-123", "type": "skill", "action": "approve" },
      {
        "id": "demand-456",
        "type": "demand",
        "action": "reject",
        "rejection_reason": "Insufficient justification"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "processed": 2,
    "results": [
      { "id": "skill-123", "status": "approved" },
      { "id": "demand-456", "status": "rejected" }
    ]
  }
  ```
- **Frontend**: Add checkboxes to approvals list, "Approve Selected" and "Reject Selected" buttons

#### 4.2 Conditional Delete for Work Logs

- **Modify**: DELETE `/api/logs/[id]`
- **Logic**:

  ```typescript
  // Check ownership
  if (log.emp_id !== user.id) {
    return error("Unauthorized");
  }

  // Check locked status
  if (log.locked) {
    return error("Cannot delete submitted timesheet entry");
  }

  // Proceed with delete
  await db.delete(daily_project_logs).where(eq(id, logId));
  ```

- **Frontend**:
  - Re-enable delete button with condition: `user.id === log.emp_id && !log.locked`
  - Add confirmation dialog: "Are you sure you want to delete this log entry?"
- **Lock Logic**: Set `locked = true` when weekly report is submitted

#### 4.3 Team Member Detail Breakdown

- **Endpoint**: GET `/api/dashboard/team/members`
- **Query Parameters**: `manager_id`, `week_start` (optional)
- **Response**:
  ```json
  {
    "team_members": [
      {
        "emp_id": "emp-123",
        "employee_code": "EMP001",
        "full_name": "John Doe",
        "weekly_hours": 40,
        "billable_hours": 32,
        "non_billable_hours": 8,
        "projects": ["PR-001", "PR-002"],
        "timesheet_submitted": true
      }
    ],
    "team_total_hours": 160,
    "team_billable_hours": 128
  }
  ```
- **Frontend**: Expandable table in manager dashboard showing individual breakdown

### Deliverables

- 1 modified API (bulk approvals)
- 1 modified API (delete logs)
- 1 new API (team member details)
- Frontend updates for approvals and logs pages
- Manager dashboard team detail widget

---

## Phase 5: Dashboard UI Enhancements

**Priority**: MEDIUM  
**Duration**: 1-2 weeks  
**Dependencies**: Phases 1, 2, 4

### Objectives

- Integrate all new metrics into dashboard
- Add visual charts and graphs
- Role-specific dashboard customization

### Features

#### 5.1 HR Dashboard Widgets

- **Active/Inactive Users Card**: Show count with status breakdown
- **Billable vs Non-Billable Hours Chart**: Bar chart for current week/month
- **Timesheet Completion Progress**: Progress bar with completed/pending counts
- **Monthly Billing Summary**: Top 5 projects by billable hours
- **Project Classification**: Pie chart showing client vs internal projects

#### 5.2 Manager Dashboard Widgets

- **Team Hours Summary**: Total hours logged by team this week
- **Team Member Details Table**: Expandable rows with individual breakdown
- **Productivity Trend Chart**: Line chart showing last 8 weeks
- **Pending Approvals Count**: Badge with quick link to approvals page
- **Team Billability**: Average billable % across team members

#### 5.3 Employee Dashboard Widgets

- **Weekly Hours Progress**: Circular progress (current hours / 40 target)
- **Billability Status**: Badge showing if current allocations are billable
- **Project Breakdown**: Pie chart of hours by project this week
- **Pending Tasks**: List of due tasks with quick complete action

#### 5.4 Chart Components

- **Library**: Use existing `components/ui/chart.tsx` (Recharts)
- **Charts**:
  - Bar chart: Billable vs Non-billable hours
  - Line chart: Weekly productivity trends
  - Pie chart: Project classification, hours breakdown
  - Progress bars: Timesheet completion, weekly hours target

### Deliverables

- Updated dashboard pages for all roles
- New chart components
- Responsive card layouts
- Real-time data refresh

---

## Additional Enhancements (Future Scope)

**Priority**: LOW  
**Status**: Pending clarification or deferred

### Features Requiring Clarification

#### A1. Per-Project Customizations

- **Status**: CLARIFICATION NEEDED
- **Requirement**: "Allow per-project or business-specific customizations (columns, fields, task types, validations)"
- **Available**: `tasks.entity_type` field for task categorization
- **Action Required**: More details needed from HR on specific customization requirements
- **Recommendation**: No development until requirements are clarified

#### A2. Sub-Project Logging

- **Status**: CLARIFICATION NEEDED
- **Current**: Projects are flat hierarchy, no parent-child relationship
- **Questions**:
  - What defines a "sub-project"?
  - Is this parent-child project relationship or something else?
  - Should employees see sub-projects separately when logging hours?
- **Action Required**: Define sub-project concept before implementation

#### A3. Bulk Log Updates

- **Status**: CLARIFICATION NEEDED
- **Current**: Bulk submission exists (POST `/api/logs` with array)
- **Question**: Does "bulk update" mean editing multiple existing logs at once?
- **Recommendation**: If bulk edit needed, create PUT `/api/logs/bulk` accepting array of log IDs and updates

#### A4. Task Templates

- **Status**: CLARIFICATION NEEDED
- **Existing**: Auto-generated tasks (daily logs at 9 AM, weekly reports on Monday)
- **Question**: What additional templates needed beyond auto-generated tasks?
- **Examples Needed**: What are "frequently performed tasks" that need templates?
- **Recommendation**: No development until specific template requirements provided

### Deferred Features

#### A5. Notifications System

- **Status**: OUT OF SCOPE (moved from Phase 1)
- **Implementation Options**:
  1. In-App Notifications: New table `notifications` with columns: `id, user_id, type, message, related_id, read, created_at`
  2. Email Notifications: Integrate SendGrid, AWS SES, or Nodemailer
  3. Push Notifications: Browser Push API or Firebase Cloud Messaging
  4. Notification Preferences: User settings for notification types
- **Notification Sources**:
  - Overdue reports: Employees with no weekly report
  - Pending approvals: Skills/demands awaiting approval
  - Due tasks: Tasks due within 3 days
- **Recommendation**: Implement in-app notifications table first, add email later
- **Dependencies**: Requires email service integration, scheduled job system
- **Effort**: 2-3 weeks for full implementation

#### A6. Automated Reminder Emails

- **Status**: OUT OF SCOPE
- **Requirement**: Email reminders for overdue reports, pending approvals
- **Dependencies**:
  - Email service integration (SendGrid, AWS SES)
  - Scheduled job system (node-cron, Bull queue)
- **Recommendation**: Defer until notification system (A5) is prioritized

---

## Implementation Summary

### Timeline Overview

- **Phase 1**: Core Metrics & Billability - 2-3 weeks
- **Phase 2**: Monthly Reporting - 2-3 weeks
- **Phase 3**: HR Export - 2 weeks
- **Phase 4**: Workflow Enhancements - 1-2 weeks
- **Phase 5**: Dashboard UI - 1-2 weeks
- **Total**: 8-12 weeks

### Resource Requirements

- **Backend Developer**: All phases
- **Frontend Developer**: Phases 3, 4, 5
- **DevOps**: Package installation (exceljs), deployment
- **QA**: Testing after each phase

### Technical Dependencies

- **New Packages**: `exceljs` for Excel export
- **No Schema Changes**: All features use existing database schema
- **New Tables**: Only if notifications (A5) is implemented later

### Success Metrics

- All 12 "Ready to Implement" features delivered
- HR can export all data types in CSV/Excel
- Billable hours tracked and visible across all roles
- Monthly billing reports automated
- Manager approval workflow improved with bulk operations
- Employee can delete unsubmitted logs

### Risk Mitigation

- Phase 1 foundation ensures billability tracking works before dependent phases
- Export functionality (Phase 3) independent of Phase 2 completion
- Workflow enhancements (Phase 4) can run parallel to Phases 2-3
- UI updates (Phase 5) at end ensures all APIs are stable
