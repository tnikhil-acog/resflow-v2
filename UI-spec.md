# **ResFlow V2 \- UI Pages Documentation**

## **Route Structure**

### **Public Routes**

- / \- Root (redirects to /login)
- /login \- Login page

### **Protected Routes (require authentication)**

All routes under /app/(pages)/ with layout wrapper

---

## **1\. LOGIN PAGE**

Route: /login  
Access: Public (unauthenticated only)  
File: app/login/page.tsx

### **Components**

- Form with fields:
  - ldap_username (text input, required)
  - password (password input, required)
  - Submit button

### **API Calls**

- POST /api/auth/login
  - On 200: Store JWT token in localStorage, redirect to /dashboard
  - On 401: Display "Invalid credentials" error message

### **Validations**

- Both fields required before submit
- Trim whitespace from ldap_username

---

## **2\. DASHBOARD PAGE**

Route: /dashboard  
Access: employee, project_manager, hr_executive  
File: app/(pages)/dashboard/page.tsx

### **Metrics Displayed**

All Roles:

- Active Projects Count: GET /api/projects/list?status=ACTIVE (count items)
- Pending Tasks Count: GET /api/tasks/list?status=DUE (count items)
- Total Logged Hours This Week: GET /api/logs/weekly-total (aggregate from Daily_Project_Logs table)
- Upcoming Tasks: GET /api/tasks/list?status=DUE (filter due_on \<= today+7days)
- Missing Reports: Check if weekly report exists for current week

### **Quick Actions (role-based visibility)**

employee:

- Log Work (→ /logs/new)
- Submit Report (→ /reports/new)

project_manager:

- Log Work (→ /logs/new)
- Submit Report (→ /reports/new)
- Request Resource (→ /demands/new)

hr_executive:

- Log Work (→ /logs/new)
- Submit Report (→ /reports/new)
- Create Allocation (→ /allocations/new)
- Add Employee (→ /employees/new)
- New Project (→ /projects/new)
- Request Resource (→ /demands/new)
- Manage Skills (→ /skills/new)

### **View All Pages Links**

- Employees (→ /employees)
- Projects (→ /projects)
- Allocations (→ /allocations)
- Logs (→ /logs)
- Reports (→ /reports)
- Demands (→ /demands) \[project_manager, hr_executive only\]
- Approvals (→ /approvals) \[hr_executive only\]
- Skills (→ /skills)
- Audit (→ /audit) \[hr_executive only\]
- Tasks (→ /tasks)
- Settings (→ /settings)

---

## **3\. EMPLOYEES LIST PAGE**

Route: /employees  
Access: employee, project_manager, hr_executive  
File: app/(pages)/employees/page.tsx

### **Data Source**

GET /api/employees/list

### **Table Columns**

employee/project_manager view:

- employee_code
- full_name
- email
- employee_role
- role (employee/intern)
- status (ACTIVE/EXITED)

hr_executive view (additional columns):

- ldap_username
- employee_type (Full-Time/Contract/Intern)
- working_location
- joined_on
- exited_on
- Actions (Edit, Exit Employee)

### **Filters**

- status (dropdown: ACTIVE, EXITED)
- department_id (dropdown)
- role (dropdown: employee, intern)

### **Actions**

hr_executive only:

- Create New Employee button (→ /employees/new)
- Edit icon on each row (→ /employees/\[id\]/edit)
- Exit Employee icon (opens confirmation modal)

All roles:

- Click row to view profile (→ /employees/\[id\])

---

## **4\. EMPLOYEE CREATE PAGE**

Route: /employees/new  
Access: hr_executive only  
File: app/(pages)/employees/new/page.tsx

### **Form Fields**

- employee_code (text, required, unique)
- ldap_username (text, required, unique)
- full_name (text, required)
- email (email, required)
- employee_type (dropdown: Full-Time, Contract, Intern)
- employee_role (enum, e.g., "employee" | "project_manager" | "hr_executive"
- employee_design (text, e.g., "Senior Engineer")
- working_location (text, e.g., "Hyderabad")
- department_id (dropdown from GET /api/departments/list)
- project_manager_id (dropdown from GET /api/employees/list WHERE role='project_manager')
- experience_years (number)
- resume_url (URL)
- college (text)
- degree (text)
- joined_on (date, required)

### **API Call**

POST /api/employees/create

### **Validations**

- employee_code: 400 error if duplicate
- ldap_username: 400 error if duplicate
- joined_on: Cannot be future date

### **On Success**

- Redirect to /employees/\[id\] with created employee_id
- Show success toast

---

## **5\. EMPLOYEE DETAIL PAGE**

Route: /employees/\[id\]  
Access: employee (own only), project_manager (own \+ team), hr_executive (all)  
File: app/(pages)/employees/\[id\]/page.tsx

### **Data Source**

GET /api/employees/get?id={id}

### **Access Control**

- employee: Can access WHERE id \= current_user_id
- project_manager: Can access WHERE id \= current_user_id OR id IN (team members)
- hr_executive: Can access any id

### **Sections Displayed**

Profile Section:

- All employee fields from GET /api/employees/get
- hr_executive only: Edit Employee button (→ /employees/\[id\]/edit)

Current Allocations Section:

- Data: GET /api/allocations/list?emp_id={id}\&active_only=true
- Table columns: Project Code, Project Name, Role, Allocation %, Start Date, End Date, Billability
- Click row: Navigate to /projects/\[project_id\]

Work Logs Section:

- Data: GET /api/logs/list?emp_id={id} (from Daily_Project_Logs table)
- Show last 7 days work hours by project
- Click: Navigate to /logs

Reports Section:

- Data: GET /api/reports/list?emp_id={id}
- Table columns: Report Type (WEEKLY only), Week Start/End Date, Status, Created At
- Filter: Status (DRAFT/SUBMITTED)
- Click row: Navigate to /reports/\[id\]

Skills Section:

- Data: GET /api/employee-skills/list?emp_id={id}
- Table columns: Skill Name, Proficiency Level, Status (PENDING/APPROVED), Approved By
- employee/project_manager (own profile): Request New Skill button
- Delete icon for PENDING skills (own profile only)

Tasks Section:

- Data: GET /api/tasks/list?owner_id={id}
- Table columns: Description, Entity Type, Due On, Status
- Actions: Mark Complete button (if DUE)

---

## **6\. EMPLOYEE EDIT PAGE**

Route: /employees/\[id\]/edit  
Access: hr_executive only  
File: app/(pages)/employees/\[id\]/edit/page.tsx

### **Form Fields**

- employee_code (disabled)
- ldap_username (disabled)
- full_name (text, required)
- email (email, required)
- employee_type (dropdown)
- employee_role (text)
- employee_design (text)
- working_location (text)
- department_id (dropdown)
- project_manager_id (dropdown)
- experience_years (number)
- resume_url (URL)
- college (text)
- degree (text)

### **API Call**

PUT /api/employees/update

### **Validations**

- Cannot update employee_code or ldap_username
- Email must be valid format

### **On Success**

- Redirect to /employees/\[id\]
- Show success toast

---

## **7\. PROJECTS LIST PAGE**

Route: /projects  
Access: employee (allocated), project_manager (managed), hr_executive (all)  
File: app/(pages)/projects/page.tsx

### **Data Source**

GET /api/projects/list

### **Access Control**

- employee: Returns WHERE id IN (SELECT project_id FROM project_allocation WHERE emp_id \= current_user_id)
- project_manager: Returns WHERE project_manager_id \= current_user_id
- hr_executive: Returns all

### **Table Columns**

- project_code
- project_name
- client_name
- project_manager_id (show name)
- priority (High/Medium/Low)
- status (Active/On Hold/Closed)
- started_on
- closed_on

### **Filters**

- status (dropdown: Active, On Hold, Closed)
- project_manager_id (dropdown) \[hr_executive only\]

### **Actions**

hr_executive only:

- Create New Project button (→ /projects/new)
- Edit icon (→ /projects/\[id\]/edit)
- Close Project button (opens modal)

All roles:

- Click row to view details (→ /projects/\[id\])

---

## **8\. PROJECT CREATE PAGE**

Route: /projects/new  
Access: hr_executive only  
File: app/(pages)/projects/new/page.tsx

### **Form Fields**

- project_code (text, required, unique)
- project_name (text, required)
- client_id (dropdown from GET /api/clients/list, with "Create New Client" option)
- project_manager_id (dropdown from GET /api/employees/list WHERE role='project_manager')
- started_on (date, required)

### **Create New Client (inline)**

If user selects "Create New Client":

- Show client_name field (text, required)
- API: POST /api/clients/create
- On success: Add to client_id dropdown and select

### **API Call**

POST /api/projects/create

### **Validations**

- project_code: 400 error if duplicate
- started_on: Cannot be future date

### **On Success**

- Redirect to /projects/\[id\] with created project_id
- Show success toast

---

## **9\. PROJECT DETAIL PAGE**

Route: /projects/\[id\]  
Access: employee (allocated), project_manager (managed), hr_executive (all)  
File: app/(pages)/projects/\[id\]/page.tsx

### **Data Source**

GET /api/projects/get?id={id}

### **Access Control**

- employee: Can access WHERE id IN (allocated projects)
- project_manager: Can access WHERE project_manager_id \= current_user_id
- hr_executive: Can access any id

### **Header**

- Project Code
- Project Name
- Status badge
- project_manager/hr_executive: Edit Project button (→ /projects/\[id\]/edit)

### **Overview Section**

- client_name
- project_manager_name
- short_description
- long_description
- pitch_deck_url (clickable link)
- github_url (clickable link)
- priority
- status
- started_on
- closed_on

### **Team Allocations Section**

- Data: GET /api/allocations/list?project_id={id}
- Table columns: Employee Code, Employee Name, Role, Allocation %, Start Date, End Date, Billability, Critical Resource
- hr_executive: Add Allocation button, Transfer action
- Click row: Navigate to /employees/\[employee_id\]

### **Phases Section**

- Link to /projects/\[id\]/phases

### **Work Logs Section**

- Data: GET /api/logs/aggregate?project_id={id} (from Daily_Project_Logs table)
- Show total hours by week
- Click: Navigate to /logs

### **Demands Section (project_manager/hr_executive only)**

- Data: GET /api/demands/list?project_id={id}
- Table columns: Role Required, Skills, Start Date, Status, Requested By
- project_manager: Create Demand button
- Actions: Edit (if REQUESTED), View details

---

## **10\. PROJECT EDIT PAGE**

Route: /projects/\[id\]/edit  
Access: project_manager (own projects), hr_executive (all)  
File: app/(pages)/projects/\[id\]/edit/page.tsx

### **Form Fields**

project_manager can edit:

- short_description
- long_description
- pitch_deck_url
- github_url
- status (dropdown: Active, On Hold) \[cannot set to Closed\]

hr_executive can edit (additional):

- project_name
- client_id (dropdown)
- project_manager_id (dropdown)
- priority (dropdown: High, Medium, Low)
- status (dropdown: Active, On Hold, Closed)
- started_on (date)
- closed_on (date, only if status=Closed)

### **API Call**

PUT /api/projects/update

### **Validations**

- project_manager: Cannot update project_code, project_name, client_id, project_manager_id
- project_manager: Cannot change status to Closed
- If status=Closed, closed_on is required

### **On Success**

- Redirect to /projects/\[id\]
- Show success toast

---

## **11\. PROJECT PHASES PAGE**

Route: /projects/\[id\]/phases  
Access: employee (allocated), project_manager (managed), hr_executive (all)  
File: app/(pages)/projects/\[id\]/phases/page.tsx

### **Data Source**

GET /api/phases/list?project_id={id}

### **Table Columns**

- phase_name
- phase_description
- created_at
- Actions (View Reports)

### **Actions**

project_manager/hr_executive:

- Create Phase button (opens modal)
- Edit Phase icon (opens modal)
- Submit Report icon (opens modal)

### **Create Phase Modal**

- Fields: phase_name (text, required), phase_description (textarea)
- API: POST /api/phases/create

### **Submit Phase Report Modal**

- Fields: content (markdown editor)
- API: POST /api/phase-reports/create

---

## **12\. ALLOCATIONS LIST PAGE**

Route: /allocations  
Access: employee (own), project_manager (managed projects), hr_executive (all)  
File: app/(pages)/allocations/page.tsx

### **Data Source**

GET /api/allocations/list

### **Access Control**

- employee: Returns WHERE emp_id \= current_user_id
- project_manager: Returns WHERE project_id IN (managed projects)
- hr_executive: Returns all

### **Table Columns**

- employee_code
- employee_name
- project_code
- project_name
- role
- allocation_percentage
- start_date
- end_date
- billability (Yes/No)
- is_critical_resource (Yes/No)

### **Filters**

- project_id (dropdown)
- emp_id (search/dropdown)
- Active Only (checkbox: WHERE start_date \<= CURRENT_DATE AND (end_date IS NULL OR end_date \>= CURRENT_DATE))

### **Actions**

hr_executive only:

- Create New Allocation button (→ /allocations/new)
- Edit icon (→ /allocations/\[id\])
- Transfer icon (opens transfer modal)

All roles:

- Click row: Navigate to /employees/\[employee_id\]

---

## **13\. ALLOCATION CREATE PAGE**

Route: /allocations/new  
Access: hr_executive only  
File: app/(pages)/allocations/new/page.tsx

### **Form Fields**

- emp_id (searchable dropdown from GET /api/employees/list?status=ACTIVE)
- project_id (dropdown from GET /api/projects/list?status=ACTIVE)
- role (text, e.g., "Backend Developer")
- allocation_percentage (number, 0-100, step 0.01)
- start_date (date, required)
- end_date (date, optional)
- billability (checkbox)
- is_critical_resource (checkbox)

### **Current Allocation Display**

When emp_id is selected:

- Show current total allocation: GET /api/allocations/list?emp_id={emp_id}\&active_only=true
- Calculate sum of allocation_percentage
- Display remaining capacity: 100 \- current_total

### **API Call**

POST /api/allocations/create

### **Validations**

- allocation_percentage \+ current_total cannot exceed 100%
- end_date must be \>= start_date
- 400 error if validation fails

### **On Success**

- Redirect to /allocations
- Show success toast

---

## **14\. ALLOCATION DETAIL/EDIT PAGE**

Route: /allocations/\[id\]  
Access: hr_executive only  
File: app/(pages)/allocations/\[id\]/page.tsx

### **Form Fields (editable)**

- allocation_percentage (number, 0-100)
- end_date (date)
- billability (checkbox)
- is_critical_resource (checkbox)

### **Read-only Fields**

- employee_name
- project_name
- role
- start_date

### **API Call**

PUT /api/allocations/update

### **Validations**

- Same as create

### **Transfer Allocation**

- Button: Transfer to Another Project
- Opens modal with fields: new_project_id (dropdown), transfer_date (date)
- API: POST /api/allocations/transfer

### **On Success**

- Redirect to /allocations
- Show success toast

---

## **15\. REPORTS LIST PAGE**

Route: /reports  
Access: employee (own), project_manager (own \+ team), hr_executive (all)  
File: app/(pages)/reports/page.tsx

### **Data Source**

GET /api/reports/list

### **Access Control**

- employee: Returns WHERE emp_id \= current_user_id
- project_manager: Returns WHERE emp_id IN (team members \+ current_user_id)
- hr_executive: Returns all

### **Table Columns**

- employee_code
- employee_name
- report_type (WEEKLY only)
- report_date (submitted date)
- week_start_date
- week_end_date
- status (DRAFT if report_date IS NULL, SUBMITTED if report_date IS NOT NULL)
- created_at

### **Filters**

- emp_id (dropdown/search) \[project_manager/hr_executive\]
- status (dropdown: DRAFT, SUBMITTED)
- week_start_date range (date range picker)

### **Actions**

All roles (own reports):

- Submit New Report button (→ /reports/new)
- View icon
- Edit icon (if DRAFT)
- Submit icon (if DRAFT \- sets report_date)

hr_executive (any report):

- Edit icon (any status)

All roles:

- Click row to view details (→ /reports/\[id\])

---

## **16\. REPORT CREATE PAGE**

Route: /reports/new  
Access: employee, project_manager, hr_executive  
File: app/(pages)/reports/new/page.tsx

### **Form Fields (WEEKLY - All Employee Types)**

- week_start_date (date, auto-set to Monday of current week)
- week_end_date (date, auto-calculated as Friday of same week)
- content (markdown editor)
- weekly_hours (Auto-calculated from Daily_Project_Logs table for the week)
  - Display summary: GET /api/logs/weekly-summary?emp_id={current_user_id}\&week_start={date}\&week_end={date}
  - Show table: Project Code | Project Name | Total Hours (read-only, from daily logs)

### **API Call**

POST /api/reports/create

### **Validations**

- Cannot create duplicate report for same emp_id \+ week_start_date \+ week_end_date
- 400 error if duplicate

### **On Success**

- Redirect to /reports
- Show success toast

---

## **17\. REPORT DETAIL PAGE**

Route: /reports/\[id\]  
Access: employee (own), project_manager (own \+ team), hr_executive (all)  
File: app/(pages)/reports/\[id\]/page.tsx

### **Data Source**

GET /api/reports/get?id={id}

### **Access Control**

- employee: Can access WHERE emp_id \= current_user_id
- project_manager: Can access WHERE emp_id IN (team \+ self)
- hr_executive: Can access any

### **Display**

- Employee name
- Report type (WEEKLY only)
- report_date (submitted date, if not NULL)
- week_start_date, week_end_date
- content (rendered markdown)
- weekly_hours (show as table: Project Code | Project Name | Hours - from Daily_Project_Logs aggregate)
- status badge (DRAFT/SUBMITTED)
- created_at

### **Actions**

If DRAFT and own report:

- Edit button (opens edit form or navigates to edit page)
- Submit button (PUT /api/reports/update with report_date \= CURRENT_DATE)

If hr_executive:

- Edit button (any status)

---

## **18\. LOGS LIST PAGE**

Route: /logs  
Access: employee, project_manager, hr_executive  
File: app/(pages)/logs/page.tsx

### **Data Storage**

- Daily logs stored in database table: Daily_Project_Logs
- Fields: id, emp_id, project_id, log_date, hours, notes, locked, created_at
- Unique constraint: (emp_id, project_id, log_date)

### **Table Columns**

- date (log_date)
- project_code
- project_name
- hours (decimal)
- notes (text)
- locked (boolean - cannot edit if true)

### **Filters**

- Date range picker
- project_id (dropdown)

### **Data Source**

- GET /api/logs/list?emp_id={id}\&start_date={date}\&end_date={date}

### **Actions**

- Create New Log button (→ /logs/new)
- Edit icon (inline edit in modal, only if not locked)
- Delete icon (only if not locked)

---

## **19\. LOG CREATE PAGE**

Route: /logs/new  
Access: employee, project_manager, hr_executive  
File: app/(pages)/logs/new/page.tsx

### **Form Fields**

- log_date (date picker, default today)
- project_id (dropdown from GET /api/allocations/list?emp_id={current_user_id}\&active_only=true)
- hours (number, required, 0-24 with 2 decimal places)
- notes (textarea, optional)

### **Validation**

- Must have valid allocation to log hours on a project
- Date cannot be future
- Hours must be \> 0 and \<= 24
- Cannot create duplicate log for same emp_id + project_id + log_date

### **API Call**

POST /api/logs/create

Body:

```json
{
  "emp_id": "uuid",
  "project_id": "uuid",
  "log_date": "YYYY-MM-DD",
  "hours": 8.5,
  "notes": "Backend API development"
}
```

### **On Success**

- Redirect to /logs
- Show success toast

---

## **20\. LOG DETAIL/EDIT PAGE**

Route: /logs/\[id\]  
Access: employee (own), project_manager (own), hr_executive (any)  
File: app/(pages)/logs/\[id\]/page.tsx

### **Data Source**

GET /api/logs/get?id={id}

### **Form Fields (editable)**

- hours (number, 0-24 with 2 decimal places)
- notes (textarea)

### **Read-only Fields**

- log_date
- project_code
- project_name
- locked status

### **API Call**

PUT /api/logs/update

### **Validations**

- Cannot edit if locked = true
- Hours must be \> 0 and \<= 24

### **On Success**

- Redirect to /logs
- Show success toast

---

## **21\. DEMANDS LIST PAGE**

Route: /demands  
Access: project_manager (own), hr_executive (all)  
File: app/(pages)/demands/page.tsx

### **Data Source**

GET /api/demands/list

### **Access Control**

- employee: No access (403 redirect)
- project_manager: Returns WHERE requested_by \= current_user_id
- hr_executive: Returns all

### **Table Columns**

- project_code
- project_name
- role_required
- skills (array display)
- start_date
- end_date
- status (REQUESTED/FULFILLED/CANCELLED)
- requested_by_name

### **Filters**

- project_id (dropdown)
- status (dropdown: REQUESTED, FULFILLED, CANCELLED)
- requested_by (dropdown) \[hr_executive only\]

### **Actions**

project_manager:

- Create New Demand button (→ /demands/new)
- Edit icon (if status=REQUESTED)
- Delete icon (if status=REQUESTED)

hr_executive:

- Fulfill button (if status=REQUESTED)
- Cancel button (if status=REQUESTED)

All roles:

- Click row to view details (→ /demands/\[id\])

---

## **22\. DEMAND CREATE PAGE**

Route: /demands/new  
Access: project_manager, hr_executive  
File: app/(pages)/demands/new/page.tsx

### **Form Fields**

- project_id (dropdown from GET /api/projects/list WHERE project_manager_id \= current_user_id for PM, all for HR)
- role_required (text, e.g., "Frontend Developer")
- skill_ids (multi-select from GET /api/skills/list)
- start_date (date, required)
- end_date (date, optional)

### **API Call**

POST /api/demands/create

### **Validations**

- project_manager: Can only create for managed projects
- end_date must be \>= start_date
- 403 error if not authorized

### **On Success**

- Redirect to /demands
- Show success toast

---

## **23\. DEMAND DETAIL PAGE**

Route: /demands/\[id\]  
Access: project_manager (own), hr_executive (all)  
File: app/(pages)/demands/\[id\]/page.tsx

### **Data Source**

GET /api/demands/get?id={id} (hypothetical endpoint, or use search)

### **Display**

- project_code, project_name
- role_required
- skills (list with names)
- start_date, end_date
- status
- requested_by_name
- created_at

### **Actions**

project_manager (if own and status=REQUESTED):

- Edit button (opens edit form)

hr_executive:

- Fulfill button (PUT /api/demands/update with status=FULFILLED)
- Cancel button (PUT /api/demands/update with status=CANCELLED)

---

## **24\. TASKS LIST PAGE**

Route: /tasks  
Access: employee (own), project_manager (own \+ team), hr_executive (all)  
File: app/(pages)/tasks/page.tsx

### **Data Source**

GET /api/tasks/list

### **Access Control**

- employee: Returns WHERE owner_id \= current_user_id
- project_manager: Returns WHERE owner_id IN (team \+ self)
- hr_executive: Returns all

### **Table Columns**

- owner_code
- owner_name
- description
- entity_type (PROJECT/EMPLOYEE/CLIENT)
- due_on
- status (DUE/COMPLETED)
- assigned_by_name
- created_at
- completed_at

### **Filters**

- owner_id (dropdown) \[project_manager/hr_executive\]
- status (dropdown: DUE, COMPLETED)
- entity_type (dropdown: PROJECT, EMPLOYEE, CLIENT)

### **Actions**

project_manager/hr_executive:

- Create Task button (opens modal for team members)

All roles:

- Mark Complete button (if status=DUE and own task)

hr_executive:

- Mark Complete button (any task)
- Delete icon

All roles:

- Click row to view details (→ /tasks/\[id\])

---

## **25\. TASK DETAIL PAGE**

Route: /tasks/\[id\]  
Access: employee (own), project_manager (own \+ team), hr_executive (all)  
File: app/(pages)/tasks/\[id\]/page.tsx

### **Data Source**

GET /api/tasks/get?id={id} (hypothetical, or extract from list)

### **Display**

- owner_name
- description
- entity_type, entity_id
- due_on
- status
- assigned_by_name
- created_at
- completed_at

### **Actions**

If status=DUE and own task:

- Mark Complete button (POST /api/tasks/complete)

hr_executive:

- Mark Complete button (any status)
- Delete button

---

## **26\. SKILLS LIST PAGE**

Route: /skills  
Access: employee, project_manager, hr_executive  
File: app/(pages)/skills/page.tsx

### **Data Source**

GET /api/skills/list

### **Table Columns**

- skill_name
- department_name
- created_at

### **Filters**

- department_id (dropdown)
- Search bar (filter by skill_name)

### **Actions**

hr_executive only:

- Add New Skill button (→ /skills/new)

All roles:

- Click row to open "Request Skill" modal

### **Request Skill Modal**

- Show skill_name
- Field: proficiency_level (dropdown: beginner, intermediate, advanced, expert)
- API: POST /api/skills/request
- On success: Close modal, show "Skill request submitted for approval"

---

## **27\. SKILLS CREATE/MANAGE PAGE**

Route: /skills/new  
Access: hr_executive only  
File: app/(pages)/skills/new/page.tsx

### **Form Fields**

- skill_name (text, required, unique)
- department_id (dropdown from GET /api/departments/list)

### **API Call**

POST /api/skills/add

### **Validations**

- 400 error if skill_name already exists

### **On Success**

- Redirect to /skills
- Show success toast

---

## **28\. APPROVALS PAGE**

Route: /approvals  
Access: project_manager (team skills only), hr_executive (all)  
File: app/(pages)/approvals/page.tsx

### **Data Source**

project_manager: GET /api/approvals/list?type=skill (filtered for team members)

hr_executive:

- Tab 1: Skill Requests \- GET /api/approvals/list?type=skill
- Tab 2: Demands \- GET /api/approvals/list?type=demand

### **Skill Requests Tab**

Table Columns:

- employee_code
- employee_name
- skill_name
- proficiency_level
- requested_at

Actions:

- Approve button (POST /api/skills/approve)
- Reject button (POST /api/skills/reject)

### **Demands Tab (hr_executive only)**

Table Columns:

- project_code
- project_name
- role_required
- skills (array)
- start_date
- end_date
- requested_by_name
- status (REQUESTED)

Actions:

- Fulfill button (PUT /api/demands/update with status=FULFILLED)
- Cancel button (PUT /api/demands/update with status=CANCELLED)

---

## **29\. AUDIT PAGE**

Route: /audit  
Access: hr_executive only  
File: app/(pages)/audit/page.tsx

### **Data Source**

GET /api/audit/list

### **Table Columns**

- entity_type (EMPLOYEE/PROJECT/ALLOCATION/etc)
- row_id (UUID of affected row)
- operation (CREATE/UPDATE/DELETE)
- changed_by (user who made change)
- changed_at (timestamp)
- changed_fields (JSONB, expandable)

### **Filters**

- entity_type (dropdown: EMPLOYEE, PROJECT, ALLOCATION, REPORT, TASK, SKILL, DEMAND)
- entity_id (text input for specific entity UUID)
- operation (dropdown: CREATE, UPDATE, DELETE)
- changed_by (dropdown from GET /api/employees/list)
- Date range (start_date to end_date)

### **Changed Fields Display**

- Expandable accordion per row
- Format: field_name: OLD_VALUE → NEW_VALUE

Example:  
status: "ACTIVE" → "EXITED"  
exited_on: null → "2026-01-20"

-

### **Pagination**

20 items per page

---

## **30\. SETTINGS PAGE**

Route: /settings  
Access: employee, project_manager, hr_executive  
File: app/(pages)/settings/page.tsx

### **Data Source**

GET /api/auth/me

### **Sections**

Tab 1: Profile

Editable Fields:

- resume_url (URL)
- college (text)
- degree (text)

Read-only Fields:

- employee_code
- ldap_username
- email
- employee_type
- employee_role
- role
- status
- joined_on
- exited_on

API Call: PUT /api/employees/update with id \= current_user_id

Tab 2: Departments (hr_executive only)

Data: GET /api/departments/list

Table Columns:

- name
- designations (comma-separated)

Actions:

- Create Department button (opens modal)
- Edit icon (inline or modal)

Create Department Modal:

- Fields: name (text, required), designations (comma-separated text)
- API: POST /api/departments/create

Tab 3: Clients (hr_executive only)

Data: GET /api/clients/list

Table Columns:

- client_name
- created_at
- Projects Count (calculated)

Actions:

- Create Client button (opens modal)
- Click row: Navigate to /clients/\[id\] (if detail page exists)

Create Client Modal:

- Fields: client_name (text, required)
- API: POST /api/clients/create

---

## **Navigation Menu (Sidebar)**

### **All Roles**

- Dashboard
- Employees
- Projects
- Allocations
- Logs
- Reports
- Tasks
- Skills
- Settings

### **project_manager Additional**

- Demands
- Approvals (skill requests only)

### **hr_executive Additional**

- Demands
- Approvals (skills \+ demands)
- Audit

---

## **Access Control Implementation**

### **Route Guards**

// Middleware or layout level  
if (\!token) redirect('/login')  
if (route \=== '/audit' && role \!== 'hr_executive') redirect('/dashboard')  
if (route \=== '/approvals' && \!\['project_manager', 'hr_executive'\].includes(role)) redirect('/dashboard')  
if (route \=== '/demands' && \!\['project_manager', 'hr_executive'\].includes(role)) redirect('/dashboard')

### **Component Visibility**

{role \=== 'hr_executive' && \<CreateEmployeeButton /\>}  
{\['project_manager', 'hr_executive'\].includes(role) && \<CreateTaskButton /\>}

---

## **Error Handling**

### **API Errors**

- 401: Clear localStorage token, redirect to /login
- 403: Show toast "Access Denied" and redirect to /dashboard
- 404: Show toast "Resource Not Found"
- 400: Show validation errors inline below form fields
- 500: Show toast "Server Error. Please try again later"

### **Form Validation**

- Required fields: Show "This field is required" below field
- Date validations: "End date must be \>= start date"
- Percentage: "Allocation must be between 0 and 100"
- Unique constraints: Show server error message from API

---

## **UI Patterns**

### **Loading States**

- Table loading: Show skeleton rows (5 rows)
- Form submit: Disable submit button, show spinner icon
- Page load: Full page skeleton or spinner

### **Toast Notifications**

- Success: Green toast, auto-dismiss in 3 seconds
- Error: Red toast, auto-dismiss in 5 seconds
- Warning: Yellow toast, auto-dismiss in 4 seconds
- Info: Blue toast, auto-dismiss in 3 seconds

### **Modals**

- Close on ESC key
- Close on overlay click
- Prevent close during form submission
- Clear form fields on close
- Show validation errors inline

### **Tables**

- Sortable columns: Click header to toggle ASC/DESC
- Search/Filter: Debounce 300ms before API call
- Pagination: 20 items per page default, show total count
- Export CSV: hr_executive only on relevant pages

### **Forms**

- Auto-save draft every 30 seconds (for reports)
- Show unsaved changes warning on navigation
- Clear button to reset form
- Cancel button to go back

---

## **Total Pages Count**

1. Login
2. Dashboard
3. Employees List
4. Employee Create
5. Employee Detail
6. Employee Edit
7. Projects List
8. Project Create
9. Project Detail
10. Project Edit
11. Project Phases
12. Allocations List
13. Allocation Create
14. Allocation Detail/Edit
15. Reports List
16. Report Create
17. Report Detail
18. Logs List
19. Log Create
20. Log Detail/Edit
21. Demands List
22. Demand Create
23. Demand Detail
24. Tasks List
25. Task Detail
26. Skills List
27. Skills Create/Manage
28. Approvals
29. Audit
30. Settings

Total: 30 pages

---

## **localStorage Schema**

### **JWT Token**

Key: auth_token  
Value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

### **User Info (optional cache)**

Key: user_info  
Value:

{  
 "id": "uuid",  
 "employee_code": "EMP001",  
 "full_name": "John Doe",  
 "role": "employee"  
}
