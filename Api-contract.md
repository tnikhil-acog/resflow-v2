# **ResFlow V2 \- API Contract**

## **Authentication**

All endpoints except /api/auth/login require: Header: Authorization: Bearer {jwt_token}

JWT Payload: { "id": "uuid", "employee_code": "string", "ldap_username": "string", "employee_role": "employee" | "project_manager" | "hr_executive", "exp": 1234567890 }

---

## **Authentication (3 endpoints)**

### **POST /api/auth/login**

Allowed Roles: None (public)

Request: { "ldap_username": "john.doe", "password": "string" }

Response 200: { "token": "eyJhbGc...", "user": { "id": "uuid", "employee_code": "EMP001", "ldap_username": "john.doe", "full_name": "John Doe", "email": "john.doe@company.com", "employee_type": "Full-Time", "employee_role": "employee" | "project_manager" | "hr_executive", "employee_design": "Senior Engineer", "status": "ACTIVE" } }

Response 401: { "error": "Invalid credentials" }

---

### **POST /api/auth/logout**

Allowed Roles: employee, project_manager, hr_executive

Response 200: { "message": "Logged out successfully" }

Response 401: { "error": "Invalid token" }

---

### **GET /api/auth/me**

Allowed Roles: employee, project_manager, hr_executive

Response 200: { "id": "uuid", "employee_code": "EMP001", "ldap_username": "john.doe", "full_name": "John Doe", "email": "john.doe@company.com", "employee_type": "Full-Time", "employee_role": "employee" | "project_manager" | "hr_executive", "employee_design": "Senior Engineer", "working_location": "Hyderabad", "department_id": "uuid", "project_manager_id": "uuid", "experience_years": 5, "resume_url": "[https://storage.company.com/resumes/EMP001.pdf](https://storage.company.com/resumes/EMP001.pdf)", "college": "IIT Delhi", "degree": "B.Tech Computer Science", "status": "ACTIVE", "joined_on": "2024-01-15", "exited_on": null }

Response 401: { "error": "Invalid token" }

---

## **Employees (5 endpoints)**

### **POST /api/employees/create**

Allowed Roles: hr_executive

Request: { "employee_code": "EMP001", "ldap_username": "john.doe", "full_name": "John Doe", "email": "john.doe@company.com", "employee_type": "Full-Time", "employee_role": "employee" | "project_manager" | "hr_executive", "employee_design": "Senior Engineer", "working_location": "Hyderabad", "department_id": "uuid", "project_manager_id": "uuid", "experience_years": 5, "resume_url": "[https://storage.company.com/resumes/EMP001.pdf](https://storage.company.com/resumes/EMP001.pdf)", "college": "IIT Delhi", "degree": "B.Tech Computer Science", "joined_on": "2024-01-15" }

Response 201: { "id": "uuid", "employee_code": "EMP001", "ldap_username": "john.doe", "full_name": "John Doe", "email": "john.doe@company.com", "status": "ACTIVE", "joined_on": "2024-01-15" }

Response 400: { "error": "employee_code already exists" }

Response 400: { "error": "ldap_username already exists" }

Response 403: { "error": "Access denied" }

---

### **GET /api/employees/list**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?status=ACTIVE\&department_id=uuid\&page=1\&limit=20

Data Filtering:

- employee: Returns list (id, employee_code, full_name, email, employee_design only)
- project_manager: Returns list (id, employee_code, full_name, email, employee_design only)
- hr_executive: Returns full data

Response 200 (employee/project_manager): { "employees": \[ { "id": "uuid", "employee_code": "EMP001", "full_name": "John Doe", "email": "john.doe@company.com", "employee_design": "Senior Engineer" } \], "total": 150, "page": 1, "limit": 20 }

Response 200 (hr_executive): { "employees": \[ { "id": "uuid", "employee_code": "EMP001", "ldap_username": "john.doe", "full_name": "John Doe", "email": "john.doe@company.com", "employee_type": "Full-Time", "employee_role": "employee" | "project_manager" | "hr_executive", "employee_design": "Senior Engineer", "working_location": "Hyderabad", "department_id": "uuid", "project_manager_id": "uuid", "status": "ACTIVE", "joined_on": "2024-01-15", "exited_on": null } \], "total": 150, "page": 1, "limit": 20 }

---

### **GET /api/employees/get**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?id=uuid

Data Filtering:

- employee: Can view WHERE id \= current_user_id
- project_manager: Can view WHERE id \= current_user_id OR id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id \= current_user_id))
- hr_executive: Can view any employee

Response 200: { "id": "uuid", "employee_code": "EMP001", "ldap_username": "john.doe", "full_name": "John Doe", "email": "john.doe@company.com", "employee_type": "Full-Time", "employee_role": "employee" | "project_manager" | "hr_executive", "employee_design": "Senior Engineer", "working_location": "Hyderabad", "department_id": "uuid", "project_manager_id": "uuid", "experience_years": 5, "resume_url": "[https://storage.company.com/resumes/EMP001.pdf](https://storage.company.com/resumes/EMP001.pdf)", "college": "IIT Delhi", "degree": "B.Tech Computer Science", "status": "ACTIVE", "joined_on": "2024-01-15", "exited_on": null }

Response 403: { "error": "Access denied" }

Response 404: { "error": "Employee not found" }

---

### **PUT /api/employees/update**

Allowed Roles: hr_executive

Request: { "id": "uuid", "full_name": "John Doe Updated", "email": "john.updated@company.com", "employee_type": "Full-Time", "employee_role": "employee" | "project_manager" | "hr_executive", "employee_design": "Lead Engineer", "working_location": "Remote", "department_id": "uuid", "project_manager_id": "uuid", "experience_years": 6, "resume_url": "[https://storage.company.com/resumes/EMP001_v2.pdf](https://storage.company.com/resumes/EMP001_v2.pdf)", "college": "IIT Delhi", "degree": "B.Tech Computer Science" }

Response 200: { "id": "uuid", "employee_code": "EMP001", "full_name": "John Doe Updated", "email": "john.updated@company.com", "employee_design": "Lead Engineer" }

Response 400: { "error": "Cannot update employee_code" }

Response 400: { "error": "Cannot update ldap_username" }

Response 403: { "error": "Access denied" }

---

### **POST /api/employees/exit**

Allowed Roles: hr_executive

Request: { "id": "uuid", "exited_on": "2026-01-20" }

Response 200: { "id": "uuid", "employee_code": "EMP001", "status": "EXITED", "exited_on": "2026-01-20", "allocations_ended": 3, "tasks_cancelled": 5 }

Response 400: { "error": "exited_on must be \>= joined_on" }

Response 400: { "error": "Employee has active allocations with end_date after exited_on" }

Response 403: { "error": "Access denied" }

---

## **Departments (2 endpoints)**

### **GET /api/departments/list**

Allowed Roles: employee, project_manager, hr_executive

Response 200: { "departments": \[ { "id": "uuid", "name": "Engineering", "designations": "Junior Engineer,Senior Engineer,Lead Engineer,Principal Engineer" }, { "id": "uuid", "name": "Design", "designations": "UI Designer,UX Designer,Design Lead" } \] }

---

### **POST /api/departments/create**

Allowed Roles: hr_executive

Request: { "name": "Engineering", "designations": "Junior Engineer,Senior Engineer,Lead Engineer" }

Response 201: { "id": "uuid", "name": "Engineering", "designations": "Junior Engineer,Senior Engineer,Lead Engineer" }

Response 400: { "error": "Department name already exists" }

Response 403: { "error": "Access denied" }

---

## **Clients (3 endpoints)**

### **GET /api/clients/list**

Allowed Roles: employee, project_manager, hr_executive

Response 200: { "clients": \[ { "id": "uuid", "client_name": "Acme Corp", "created_at": "2026-01-15" } \] }

---

### **POST /api/clients/create**

Allowed Roles: hr_executive

Request: { "client_name": "Acme Corp" }

Response 201: { "id": "uuid", "client_name": "Acme Corp", "created_at": "2026-01-20" }

Response 400: { "error": "client_name already exists" }

Response 403: { "error": "Access denied" }

---

### **GET /api/clients/get**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?id=uuid

Response 200: { "id": "uuid", "client_name": "Acme Corp", "created_at": "2026-01-15", "projects": \[ { "id": "uuid", "project_code": "PR-001", "project_name": "E-commerce Platform" } \] }

Response 404: { "error": "Client not found" }

---

## **Projects (6 endpoints)**

### **POST /api/projects/create**

Allowed Roles: hr_executive

Request: { "project_code": "PR-001", "project_name": "E-commerce Platform", "client_id": "uuid", "project_manager_id": "uuid", "started_on": "2026-01-20" }

Response 201: { "id": "uuid", "project_code": "PR-001", "project_name": "E-commerce Platform", "client_id": "uuid", "project_manager_id": "uuid", "status": "DRAFT", "started_on": "2026-01-20" }

Response 400: { "error": "project_code already exists" }

Response 403: { "error": "Access denied" }

---

### **GET /api/projects/list**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?status=ACTIVE\&project_manager_id=uuid\&page=1\&limit=20

Data Filtering:

- employee: Returns all projects
- project_manager: Returns all projects
- hr_executive: Returns all projects

Response 200: { "projects": \[ { "id": "uuid", "project_code": "PR-001", "project_name": "E-commerce Platform", "client_id": "uuid", "client_name": "Acme Corp", "project_manager_id": "uuid", "project_manager_name": "Jane Smith", "status": "ACTIVE", "started_on": "2026-01-20", "closed_on": null } \], "total": 45, "page": 1, "limit": 20 }

---

### **GET /api/projects/get**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?id=uuid

Data Filtering:

- employee: Can view WHERE id IN (SELECT project_id FROM project_allocation WHERE emp_id \= current_user_id)
- project_manager: Can view WHERE project_manager_id \= current_user_id
- hr_executive: Can view any project

Response 200: { "id": "uuid", "project_code": "PR-001", "project_name": "E-commerce Platform", "client_id": "uuid", "client_name": "Acme Corp", "short_description": "Build e-commerce platform", "long_description": "Full-featured e-commerce platform with payment integration", "pitch_deck_url": "[https://storage.company.com/pitches/PR-001.pdf](https://storage.company.com/pitches/PR-001.pdf)", "github_url": "[https://github.com/company/ecommerce](https://github.com/company/ecommerce)", "project_manager_id": "uuid", "project_manager_name": "Jane Smith", "status": "ACTIVE", "started_on": "2026-01-20", "closed_on": null }

Response 403: { "error": "Access denied" }

Response 404: { "error": "Project not found" }

---

### **PUT /api/projects/update**

Allowed Roles: project_manager, hr_executive

Request (project_manager): { "id": "uuid", "short_description": "Updated description", "long_description": "Updated long description", "pitch_deck_url": "[https://storage.company.com/pitches/PR-001-v2.pdf](https://storage.company.com/pitches/PR-001-v2.pdf)", "github_url": "[https://github.com/company/ecommerce-v2](https://github.com/company/ecommerce-v2)", "status": "ACTIVE" }

Request (hr_executive): { "id": "uuid", "project_name": "E-commerce Platform v2", "client_id": "uuid", "short_description": "Updated description", "long_description": "Updated long description", "pitch_deck_url": "[https://storage.company.com/pitches/PR-001-v2.pdf](https://storage.company.com/pitches/PR-001-v2.pdf)", "github_url": "[https://github.com/company/ecommerce-v2](https://github.com/company/ecommerce-v2)", "project_manager_id": "uuid", "status": "ACTIVE", "started_on": "2026-01-20" }

Validation (project_manager):

- Can update WHERE project_manager_id \= current_user_id
- Can update ONLY: short_description, long_description, pitch_deck_url, github_url, status
- Cannot update: project_code, project_name, client_id, project_manager_id, started_on
- Status transitions allowed: DRAFT→ACTIVE, ACTIVE→ON_HOLD, ON_HOLD→ACTIVE
- Cannot transition to COMPLETED or CANCELLED

Validation (hr_executive):

- Can update all fields
- Cannot update project_code
- All status transitions allowed

Response 200: { "id": "uuid", "project_code": "PR-001", "project_name": "E-commerce Platform v2", "status": "ACTIVE" }

Response 400: { "error": "Cannot update project_code" }

Response 400: { "error": "Invalid status transition from DRAFT to COMPLETED" }

Response 403: { "error": "Access denied. Not your project" }

Response 403: { "error": "Cannot update project_name. HR only" }

---

### **POST /api/projects/close**

Allowed Roles: hr_executive

Request: { "id": "uuid", "status": "COMPLETED", "closed_on": "2026-06-20" }

Response 200: { "id": "uuid", "project_code": "PR-001", "status": "COMPLETED", "closed_on": "2026-06-20", "allocations_ended": 5 }

Response 400: { "error": "status must be COMPLETED or CANCELLED" }

Response 400: { "error": "Project has active allocations with end_date after closed_on" }

Response 403: { "error": "Access denied" }

---

### **GET /api/projects/status-transitions**

Allowed Roles: project_manager, hr_executive

Query Parameters: ?current_status=DRAFT\&role=project_manager

Response 200: { "current_status": "DRAFT", "allowed_transitions": \["ACTIVE"\] }

Response 200 (status=ACTIVE, role=project_manager): { "current_status": "ACTIVE", "allowed_transitions": \["ON_HOLD"\] }

Response 200 (status=ACTIVE, role=hr_executive): { "current_status": "ACTIVE", "allowed_transitions": \["ON_HOLD", "COMPLETED", "CANCELLED"\] }

---

## **Phases (4 endpoints)**

### **POST /api/phases/create**

Allowed Roles: project_manager, hr_executive

Request: { "project_id": "uuid", "phase_name": "Phase 1: Design", "phase_description": "Complete UI/UX design and prototypes" }

Validation:

- project_manager: Can create WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id \= current_user_id)
- hr_executive: Can create for any project

Response 201: { "id": "uuid", "project_id": "uuid", "phase_name": "Phase 1: Design", "phase_description": "Complete UI/UX design and prototypes", "created_at": "2026-01-20" }

Response 403: { "error": "Access denied. Not your project" }

---

### **GET /api/phases/list**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?project_id=uuid

Data Filtering:

- employee: Returns WHERE project_id IN (SELECT project_id FROM project_allocation WHERE emp_id \= current_user_id)
- project_manager: Returns WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id \= current_user_id)
- hr_executive: Returns all phases

Response 200: { "phases": \[ { "id": "uuid", "project_id": "uuid", "project_code": "PR-001", "project_name": "E-commerce Platform", "phase_name": "Phase 1: Design", "phase_description": "Complete UI/UX design and prototypes", "created_at": "2026-01-20" } \] }

Response 403: { "error": "Access denied" }

---

### **PUT /api/phases/update**

Allowed Roles: project_manager, hr_executive

Request: { "id": "uuid", "phase_name": "Phase 1: Design (Updated)", "phase_description": "Updated description" }

Validation:

- project_manager: Can update WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id \= current_user_id)
- hr_executive: Can update any phase

Response 200: { "id": "uuid", "phase_name": "Phase 1: Design (Updated)", "phase_description": "Updated description" }

Response 403: { "error": "Access denied" }

---

### **POST /api/phase-reports/create**

Allowed Roles: project_manager, hr_executive

Request: { "phase_id": "uuid", "content": "Phase completed successfully. All designs approved." }

Validation:

- project_manager: Can create WHERE phase_id IN (SELECT id FROM phase WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id \= current_user_id))
- hr_executive: Can create for any phase

Response 201: { "id": "uuid", "phase_id": "uuid", "content": "Phase completed successfully. All designs approved.", "submitted_by": "uuid", "submitted_at": "2026-01-20" }

Response 403: { "error": "Access denied" }

### **PUT /api/phase-reports/update**

Allowed Roles: hr_executive

---

## **Allocations (4 endpoints)**

### **POST /api/allocations/create**

Allowed Roles: hr_executive

Request: { "emp_id": "uuid", "project_id": "uuid", "role": "Backend Developer", "allocation_percentage": 50.00, "start_date": "2026-01-20", "end_date": "2026-06-20", "billability": true, "is_critical_resource": false }

Response 201: { "id": "uuid", "emp_id": "uuid", "project_id": "uuid", "role": "Backend Developer", "allocation_percentage": 50.00, "start_date": "2026-01-20", "end_date": "2026-06-20", "billability": true, "is_critical_resource": false, "assigned_by": "uuid" }

Response 400: { "error": "Employee allocation exceeds 100%. Current: 70%, Requested: 50%, Total: 120%" }

Response 400: { "error": "end_date must be \>= start_date" }

Response 403: { "error": "Access denied" }

---

### **GET /api/allocations/list**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?emp_id=uuid\&project_id=uuid\&active_only=true\&page=1\&limit=20

Data Filtering:

- employee: Returns WHERE emp_id \= current_user_id
- project_manager: Returns WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id \= current_user_id)
- hr_executive: Returns all allocations

active_only=true filters: WHERE start_date \<= CURRENT_DATE AND (end_date IS NULL OR end_date \>= CURRENT_DATE)

Response 200: { "allocations": \[ { "id": "uuid", "emp_id": "uuid", "employee_code": "EMP001", "employee_name": "John Doe", "project_id": "uuid", "project_code": "PR-001", "project_name": "E-commerce Platform", "role": "Backend Developer", "allocation_percentage": 50.00, "start_date": "2026-01-20", "end_date": "2026-06-20", "billability": true, "is_critical_resource": false, "assigned_by": "uuid" } \], "total": 200, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

### **PUT /api/allocations/update**

Allowed Roles: hr_executive

Request: { "id": "uuid", "allocation_percentage": 75.00, "end_date": "2026-08-20", "billability": false, "is_critical_resource": true }

Response 200: { "id": "uuid", "allocation_percentage": 75.00, "end_date": "2026-08-20", "billability": false, "is_critical_resource": true }

Response 400: { "error": "Updated allocation exceeds 100%. Current other: 50%, Requested: 75%, Total: 125%" }

Response 403: { "error": "Access denied" }

---

### **POST /api/allocations/transfer**

Allowed Roles: hr_executive

Request: { "allocation_id": "uuid", "new_project_id": "uuid", "transfer_date": "2026-02-01" }

Logic:

1. Update old allocation: SET end_date \= transfer_date
2. Create new allocation: Same emp_id, role, allocation_percentage, billability, is_critical_resource; start_date \= transfer_date; project_id \= new_project_id

Response 200: { "old_allocation": { "id": "uuid", "end_date": "2026-02-01" }, "new_allocation": { "id": "uuid", "emp_id": "uuid", "project_id": "uuid", "role": "Backend Developer", "allocation_percentage": 50.00, "start_date": "2026-02-01", "end_date": "2026-06-20", "billability": true, "is_critical_resource": false, "assigned_by": "uuid" } }

Response 400: { "error": "transfer_date must be between start_date and end_date" }

Response 403: { "error": "Access denied" }

---

## **Reports (4 endpoints)**

### **POST /api/reports/create**

Allowed Roles: employee, project_manager, hr_executive

Request (Full-Time \- WEEKLY): { "emp_id": "uuid", "report_type": "WEEKLY", "week_start_date": "2026-01-13", "week_end_date": "2026-01-17", "content": "\#\# Accomplishments\\n- Completed authentication module\\n- Fixed 3 bugs", "weekly_hours": { "PR-001": 40, "PR-002": 10 } }

Request (Intern NOT on projects \- DAILY): { "emp_id": "uuid", "report_type": "DAILY", "report_date": "2026-01-20", "content": "\#\# Today's Work\\n- Attended onboarding\\n- Setup development environment", "weekly_hours": null }

Validation:

- All roles: Can create WHERE emp_id \= current_user_id
- Full-Time employees: report_type must be WEEKLY
- Interns on projects: report_type must be WEEKLY
- Interns NOT on projects: report_type must be DAILY
- report_date must be NULL on creation (DRAFT status)

Response 201: { "id": "uuid", "emp_id": "uuid", "report_type": "WEEKLY", "report_date": null, "week_start_date": "2026-01-13", "week_end_date": "2026-01-17", "content": "\#\# Accomplishments\\n- Completed authentication module\\n- Fixed 3 bugs", "weekly_hours": { "PR-001": 40, "PR-002": 10 }, "created_at": "2026-01-20" }

Response 400: { "error": "Report already exists for this employee and date range" }

Response 403: { "error": "Access denied. Cannot create reports for other employees" }

---

### **GET /api/reports/list**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?emp_id=uuid\&report_type=WEEKLY\&week_start_date=2026-01-01\&week_end_date=2026-01-31\&status=DRAFT\&page=1\&limit=20

status parameter values:

- DRAFT: WHERE report_date IS NULL
- SUBMITTED: WHERE report_date IS NOT NULL

Data Filtering:

- employee: Returns WHERE emp_id \= current_user_id
- project_manager: Returns WHERE emp_id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id \= current_user_id)) OR emp_id \= current_user_id
- hr_executive: Returns all reports

Response 200: { "reports": \[ { "id": "uuid", "emp_id": "uuid", "employee_code": "EMP001", "employee_name": "John Doe", "report_type": "WEEKLY", "report_date": "2026-01-20", "week_start_date": "2026-01-13", "week_end_date": "2026-01-17", "content": "\#\# Accomplishments\\n- Completed authentication module", "weekly_hours": { "PR-001": 40, "PR-002": 10 }, "status": "SUBMITTED", "created_at": "2026-01-20" } \], "total": 50, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

### **GET /api/reports/get**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?id=uuid

Data Filtering:

- employee: Can view WHERE emp_id \= current_user_id
- project_manager: Can view WHERE emp_id IN team OR emp_id \= current_user_id
- hr_executive: Can view any report

Response 200: { "id": "uuid", "emp_id": "uuid", "employee_code": "EMP001", "employee_name": "John Doe", "report_type": "WEEKLY", "report_date": "2026-01-20", "week_start_date": "2026-01-13", "week_end_date": "2026-01-17", "content": "\#\# Accomplishments\\n- Completed authentication module\\n- Fixed 3 bugs", "weekly_hours": { "PR-001": 40, "PR-002": 10 }, "status": "SUBMITTED", "created_at": "2026-01-20" }

Response 403: { "error": "Access denied" }

Response 404: { "error": "Report not found" }

---

### **PUT /api/reports/update**

Allowed Roles: hr_executive

Request: { "id": "uuid", "content": "\#\# Updated Accomplishments\\n- Completed authentication module\\n- Fixed 5 bugs", "weekly_hours": { "PR-001": 45, "PR-002": 5 }, "report_date": "2026-01-20" }

Validation:

- hr_executive: Can update any report

Submit report (change DRAFT to SUBMITTED):

- Set report_date to current date
- Once report_date is set, employee/project_manager cannot edit

Response 200: { "id": "uuid", "emp_id": "uuid", "content": "\#\# Updated Accomplishments\\n- Completed authentication module\\n- Fixed 5 bugs", "report_date": "2026-01-20", "status": "SUBMITTED" }

Response 403: { "error": "Access denied. Cannot update submitted reports" }

Response 403: { "error": "Access denied. Cannot update reports for other employees" }

---

## **Demands (3 endpoints)**

### **POST /api/demands/create**

Allowed Roles: project_manager, hr_executive

Request: { "project_id": "uuid", "role_required": "Frontend Developer", "skill_ids": \["uuid1", "uuid2", "uuid3"\], "start_date": "2026-02-01", "end_date": "2026-08-01" }

Validation:

- project_manager: Can create WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id \= current_user_id)
- hr_executive: Can create for any project

Response 201: { "id": "uuid", "project_id": "uuid", "project_code": "PR-001", "role_required": "Frontend Developer", "skill_ids": \["uuid1", "uuid2", "uuid3"\], "start_date": "2026-02-01", "end_date": "2026-08-01", "requested_by": "uuid", "status": "REQUESTED" }

Response 400: { "error": "end_date must be \>= start_date" }

Response 403: { "error": "Access denied. Cannot create demand for projects you don't manage" }

---

### **GET /api/demands/list**

Allowed Roles: project_manager, hr_executive

Query Parameters: ?project_id=uuid\&status=REQUESTED\&requested_by=uuid\&page=1\&limit=20

Data Filtering:

- project_manager: Returns WHERE requested_by \= current_user_id
- hr_executive: Returns all demands

Response 200: { "demands": \[ { "id": "uuid", "project_id": "uuid", "project_code": "PR-001", "project_name": "E-commerce Platform", "role_required": "Frontend Developer", "skills": \[ { "skill_id": "uuid1", "skill_name": "React" }, { "skill_id": "uuid2", "skill_name": "TypeScript" } \], "start_date": "2026-02-01", "end_date": "2026-08-01", "requested_by": "uuid", "requested_by_name": "Jane Smith", "status": "REQUESTED" } \], "total": 15, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

### **PUT /api/demands/update**

Allowed Roles: project_manager, hr_executive

Request (project_manager \- while status=REQUESTED): { "id": "uuid", "role_required": "Senior Frontend Developer", "skill_ids": \["uuid1", "uuid2", "uuid3", "uuid4"\], "end_date": "2026-09-01" }

Request (hr_executive \- status change): { "id": "uuid", "status": "FULFILLED" }

Validation:

- project_manager: Can update WHERE requested_by \= current_user_id AND status \= 'REQUESTED'
- project_manager: Cannot change status
- hr_executive: Can update any demand
- hr_executive: Can change status to FULFILLED or CANCELLED

Response 200: { "id": "uuid", "role_required": "Senior Frontend Developer", "status": "FULFILLED" }

Response 403: { "error": "Access denied. Cannot edit demand after HR review" }

Response 403: { "error": "Access denied. Cannot change demand status" }

---

## **Tasks (3 endpoints)**

### **POST /api/tasks/create**

Allowed Roles: project_manager, hr_executive

Request: { "owner_id": "uuid", "entity_id": "uuid", "entity_type": "PROJECT", "description": "Complete project documentation", "due_on": "2026-01-25" }

Validation:

- project_manager: Can create WHERE owner_id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id \= current_user_id))
- hr_executive: Can create for any employee

Response 201: { "id": "uuid", "owner_id": "uuid", "entity_id": "uuid", "entity_type": "PROJECT", "description": "Complete project documentation", "status": "DUE", "due_on": "2026-01-25", "assigned_by": "uuid", "created_at": "2026-01-20" }

Response 403: { "error": "Access denied. Cannot assign tasks to non-team members" }

---

### **GET /api/tasks/list**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?owner_id=uuid\&status=DUE\&entity_type=PROJECT\&page=1\&limit=20

Data Filtering:

- employee: Returns WHERE owner_id \= current_user_id
- project_manager: Returns WHERE owner_id IN team OR owner_id \= current_user_id
- hr_executive: Returns all tasks

Response 200: { "tasks": \[ { "id": "uuid", "owner_id": "uuid", "owner_name": "John Doe", "entity_id": "uuid", "entity_type": "PROJECT", "description": "Complete project documentation", "status": "DUE", "due_on": "2026-01-25", "assigned_by": "uuid", "assigned_by_name": "Jane Smith", "created_at": "2026-01-20" } \], "total": 10, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

### **POST /api/tasks/complete**

Allowed Roles: employee, project_manager, hr_executive

Request: { "id": "uuid" }

Validation:

- employee: Can complete WHERE owner_id \= current_user_id
- project_manager: Can complete WHERE owner_id \= current_user_id
- hr_executive: Can complete any task

Response 200: { "id": "uuid", "status": "COMPLETED", "completed_at": "2026-01-20" }

Response 403: { "error": "Access denied. Cannot complete tasks assigned to other employees" }

---

## **Skills (5 endpoints)**

### **POST /api/skills/add**

Allowed Roles: hr_executive

Request: { "skill_name": "React", "department_id": "uuid" }

Response 201: { "skill_id": "uuid", "skill_name": "React", "department_id": "uuid", "created_at": "2026-01-20" }

Response 400: { "error": "Skill name already exists" }

Response 403: { "error": "Access denied" }

---

### **GET /api/skills/list**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?department_id=uuid\&page=1\&limit=50

Response 200: { "skills": \[ { "skill_id": "uuid", "skill_name": "React", "department_id": "uuid", "department_name": "Engineering", "created_at": "2026-01-20" } \], "total": 120, "page": 1, "limit": 50 }

---

### **POST /api/skills/request**

Allowed Roles: employee, project_manager, hr_executive

Request: { "emp_id": "uuid", "skill_id": "uuid", "proficiency_level": "advanced" }

Validation:

- All roles: Can request WHERE emp_id \= current_user_id

Response 201: { "skill_id": "uuid", "emp_id": "uuid", "skill_name": "React", "proficiency_level": "advanced", "approved_by": null, "approved_at": null, "status": "PENDING" }

Response 400: { "error": "Skill already exists for this employee" }

Response 403: { "error": "Access denied. Cannot request skills for other employees" }

---

### **POST /api/skills/approve**

Allowed Roles: project_manager, hr_executive

Request: { "emp_id": "uuid", "skill_id": "uuid" }

Validation:

- project_manager: Can approve WHERE emp_id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id \= current_user_id))
- hr_executive: Can approve for any employee

Response 200: { "skill_id": "uuid", "emp_id": "uuid", "skill_name": "React", "proficiency_level": "advanced", "approved_by": "uuid", "approved_at": "2026-01-20", "status": "APPROVED" }

Response 403: { "error": "Access denied. Cannot approve skills for non-team members" }

Response 404: { "error": "Skill request not found" }

---

### **POST /api/skills/reject**

Allowed Roles: project_manager, hr_executive

Request: { "emp_id": "uuid", "skill_id": "uuid" }

Validation:

- project_manager: Can reject WHERE emp_id IN team
- hr_executive: Can reject for any employee

Logic: DELETE FROM employee_skills WHERE emp_id \= ? AND skill_id \= ?

Response 200: { "message": "Skill request rejected and deleted" }

Response 403: { "error": "Access denied. Cannot reject skills for non-team members" }

---

## **Approvals (1 endpoint)**

### **GET /api/approvals/list**

Allowed Roles: project_manager, hr_executive

Query Parameters: ?type=skill\&page=1\&limit=20

type parameter values:

- skill: Returns pending skill requests
- demand: Returns pending demands (REQUESTED status)

Data Filtering:

- project_manager:
  - skill type: Returns WHERE emp_id IN team AND approved_by IS NULL
  - demand type: Not accessible
- hr_executive:
  - skill type: Returns all WHERE approved_by IS NULL
  - demand type: Returns all WHERE status \= 'REQUESTED'

Response 200 (type=skill): { "approvals": \[ { "id": "uuid", "type": "skill", "emp_id": "uuid", "employee_code": "EMP001", "employee_name": "John Doe", "skill_id": "uuid", "skill_name": "React", "proficiency_level": "advanced", "requested_at": "2026-01-20" } \], "total": 25, "page": 1, "limit": 20 }

Response 200 (type=demand): { "approvals": \[ { "id": "uuid", "type": "demand", "project_id": "uuid", "project_code": "PR-001", "project_name": "E-commerce Platform", "role_required": "Frontend Developer", "requested_by": "uuid", "requested_by_name": "Jane Smith", "start_date": "2026-02-01", "end_date": "2026-08-01", "status": "REQUESTED" } \], "total": 10, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

## **Audit (1 endpoint)**

### **GET /api/audit/list**

Allowed Roles: hr_executive

Query Parameters: ?entity_type=EMPLOYEE\&entity_id=uuid\&operation=UPDATE\&changed_by=uuid\&start_date=2026-01-01\&end_date=2026-01-31\&page=1\&limit=20

Response 200: { "audits": \[ { "id": "uuid", "entity_id": "uuid", "entity_type": "EMPLOYEE", "row_id": "uuid", "operation": "UPDATE", "changed_by": "uuid", "changed_by_name": "HR Admin", "changed_at": "2026-01-20", "changed_fields": { "status": { "old": "ACTIVE", "new": "EXITED" }, "exited_on": { "old": null, "new": "2026-01-20" } } } \], "total": 500, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

## **Employee Skills (2 endpoints)**

### **GET /api/employee-skills/list**

Allowed Roles: employee, project_manager, hr_executive

Query Parameters: ?emp_id=uuid\&status=APPROVED\&page=1\&limit=50

status parameter values:

- PENDING: WHERE approved_by IS NULL AND approved_at IS NULL
- APPROVED: WHERE approved_by IS NOT NULL AND approved_at IS NOT NULL

Data Filtering:

- employee: Returns WHERE emp_id \= current_user_id
- project_manager: Returns WHERE emp_id IN team OR emp_id \= current_user_id
- hr_executive: Returns all employee skills

Response 200: { "employee_skills": \[ { "skill_id": "uuid", "skill_name": "React", "emp_id": "uuid", "employee_code": "EMP001", "employee_name": "John Doe", "proficiency_level": "advanced", "approved_by": "uuid", "approved_by_name": "HR Admin", "approved_at": "2026-01-20", "status": "APPROVED" } \], "total": 50, "page": 1, "limit": 50 }

Response 403: { "error": "Access denied" }

---

### **DELETE /api/employee-skills/delete**

Allowed Roles: employee, project_manager, hr_executive

Request: { "emp_id": "uuid", "skill_id": "uuid" }

Validation:

- employee: Can delete WHERE emp_id \= current_user_id AND approved_by IS NULL
- project_manager: Can delete WHERE emp_id \= current_user_id AND approved_by IS NULL
- hr_executive: Can delete any employee skill

Response 200: { "message": "Employee skill deleted successfully" }

Response 403: { "error": "Access denied. Cannot delete approved skills" }

Response 403: { "error": "Access denied. Cannot delete skills for other employees" }

---

## **RBAC Summary**

| Endpoint                             | employee         | project_manager    | hr_executive |
| ------------------------------------ | ---------------- | ------------------ | ------------ |
| POST /api/auth/login                 | ✅               | ✅                 | ✅           |
| POST /api/auth/logout                | ✅               | ✅                 | ✅           |
| GET /api/auth/me                     | ✅               | ✅                 | ✅           |
| POST /api/employees/create           | ❌               | ❌                 | ✅           |
| GET /api/employees/list              | ✅ (limited)     | ✅ (limited)       | ✅ (full)    |
| GET /api/employees/get               | ✅ (own)         | ✅ (own+team)      | ✅ (all)     |
| PUT /api/employees/update            | ❌               | ❌                 | ✅           |
| POST /api/employees/exit             | ❌               | ❌                 | ✅           |
| GET /api/departments/list            | ✅               | ✅                 | ✅           |
| POST /api/departments/create         | ❌               | ❌                 | ✅           |
| GET /api/clients/list                | ✅               | ✅                 | ✅           |
| POST /api/clients/create             | ❌               | ❌                 | ✅           |
| GET /api/clients/get                 | ✅               | ✅                 | ✅           |
| POST /api/projects/create            | ❌               | ❌                 | ✅           |
| GET /api/projects/list               | ✅ (allocated)   | ✅ (managed)       | ✅ (all)     |
| GET /api/projects/get                | ✅ (allocated)   | ✅ (managed)       | ✅ (all)     |
| PUT /api/projects/update             | ❌               | ✅ (limited)       | ✅ (full)    |
| POST /api/projects/close             | ❌               | ❌                 | ✅           |
| GET /api/projects/status-transitions | ❌               | ✅                 | ✅           |
| POST /api/phases/create              | ❌               | ✅ (managed)       | ✅ (all)     |
| GET /api/phases/list                 | ✅ (allocated)   | ✅ (managed)       | ✅ (all)     |
| PUT /api/phases/update               | ❌               | ✅ (managed)       | ✅ (all)     |
| POST /api/phase-reports/create       | ❌               | ✅ (managed)       | ✅ (all)     |
| POST /api/allocations/create         | ❌               | ❌                 | ✅           |
| GET /api/allocations/list            | ✅ (own)         | ✅ (managed)       | ✅ (all)     |
| PUT /api/allocations/update          | ❌               | ❌                 | ✅           |
| POST /api/allocations/transfer       | ❌               | ❌                 | ✅           |
| POST /api/reports/create             | ✅ (own)         | ✅ (own)           | ✅ (own)     |
| GET /api/reports/list                | ✅ (own)         | ✅ (own+team)      | ✅ (all)     |
| GET /api/reports/get                 | ✅ (own)         | ✅ (own+team)      | ✅ (all)     |
| PUT /api/reports/update              | ✅ (own DRAFT)   | ✅ (own DRAFT)     | ✅ (all)     |
| POST /api/demands/create             | ❌               | ✅ (managed)       | ✅ (all)     |
| GET /api/demands/list                | ❌               | ✅ (own)           | ✅ (all)     |
| PUT /api/demands/update              | ❌               | ✅ (own REQUESTED) | ✅ (all)     |
| POST /api/tasks/create               | ❌               | ✅ (team)          | ✅ (all)     |
| GET /api/tasks/list                  | ✅ (own)         | ✅ (own+team)      | ✅ (all)     |
| POST /api/tasks/complete             | ✅ (own)         | ✅ (own)           | ✅ (all)     |
| POST /api/skills/add                 | ❌               | ❌                 | ✅           |
| GET /api/skills/list                 | ✅               | ✅                 | ✅           |
| POST /api/skills/request             | ✅ (own)         | ✅ (own)           | ✅ (own)     |
| POST /api/skills/approve             | ❌               | ✅ (team)          | ✅ (all)     |
| POST /api/skills/reject              | ❌               | ✅ (team)          | ✅ (all)     |
| GET /api/approvals/list              | ❌               | ✅ (team skills)   | ✅ (all)     |
| GET /api/audit/list                  | ❌               | ❌                 | ✅           |
| GET /api/employee-skills/list        | ✅ (own)         | ✅ (own+team)      | ✅ (all)     |
| DELETE /api/employee-skills/delete   | ✅ (own PENDING) | ✅ (own PENDING)   | ✅ (all)     |

---

## **Error Codes**

| Code | Message                                  |
| ---- | ---------------------------------------- |
| 400  | Bad Request \- Invalid input data        |
| 401  | Unauthorized \- Invalid or missing token |
| 403  | Forbidden \- Insufficient permissions    |
| 404  | Not Found \- Resource does not exist     |
| 409  | Conflict \- Duplicate entry              |
| 500  | Internal Server Error                    |

---

## **Pagination**

All list endpoints support pagination:

- Default: page=1, limit=20
- Maximum limit: 100

Response format: { "data": \[...\], "total": 500, "page": 1, "limit": 20 }

---

## **Date Formats**

All dates use ISO 8601 format: YYYY-MM-DD All timestamps use ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ

---

## **Weekly Hours JSON Structure**

{  
 "PR-001": 40,  
 "PR-002": 10,  
 "PR-003": 0  
}

Key \= project_code Value \= hours worked (integer or decimal)

---

## **Audit Changed Fields JSON Structure**

{  
 "field_name": {  
 "old": "previous_value",  
 "new": "new_value"  
 }  
}
