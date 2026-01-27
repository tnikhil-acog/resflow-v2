# **ResFlow V2 \- API Contract**

## **Authentication**

All endpoints except /api/auth/login require: Header: Authorization: Bearer {jwt\_token}

JWT Payload: { "id": "uuid", "employee\_code": "string", "ldap\_username": "string", "employee\_role": "employee" | "project\_manager" | "hr\_executive", "exp": 1234567890 }

---

## **Authentication (3 endpoints)**

### **POST /api/auth/login**

Allowed Roles: None (public)

Request: { "ldap\_username": "john.doe", "password": "string" }

Response 200: { "token": "eyJhbGc...", "user": { "id": "uuid", "employee\_code": "EMP001", "ldap\_username": "john.doe", "full\_name": "John Doe", "email": "john.doe@company.com", "employee\_type": "Full-Time", "employee\_role": "employee" | "project\_manager" | "hr\_executive", "employee\_design": "Senior Engineer", "status": "ACTIVE" } }

Response 401: { "error": "Invalid credentials" }

---

### **POST /api/auth/logout**

Allowed Roles: employee, project\_manager, hr\_executive

Response 200: { "message": "Logged out successfully" }

Response 401: { "error": "Invalid token" }

---

### **GET /api/auth/me**

Allowed Roles: employee, project\_manager, hr\_executive

Response 200: { "id": "uuid", "employee\_code": "EMP001", "ldap\_username": "john.doe", "full\_name": "John Doe", "email": "john.doe@company.com", "employee\_type": "Full-Time", "employee\_role": "employee" | "project\_manager" | "hr\_executive", "employee\_design": "Senior Engineer", "working\_location": "Hyderabad", "department\_id": "uuid", "project\_manager\_id": "uuid", "experience\_years": 5, "resume\_url": "[https://storage.company.com/resumes/EMP001.pdf](https://storage.company.com/resumes/EMP001.pdf)", "college": "IIT Delhi", "degree": "B.Tech Computer Science", "status": "ACTIVE", "joined\_on": "2024-01-15", "exited\_on": null }

Response 401: { "error": "Invalid token" }

---

## **Employees (5 endpoints)**

### **POST /api/employees/create**

Allowed Roles: hr\_executive

Request: { "employee\_code": "EMP001", "ldap\_username": "john.doe", "full\_name": "John Doe", "email": "john.doe@company.com", "employee\_type": "Full-Time", "employee\_role": "employee" | "project\_manager" | "hr\_executive", "employee\_design": "Senior Engineer", "working\_location": "Hyderabad", "department\_id": "uuid", "project\_manager\_id": "uuid", "experience\_years": 5, "resume\_url": "[https://storage.company.com/resumes/EMP001.pdf](https://storage.company.com/resumes/EMP001.pdf)", "college": "IIT Delhi", "degree": "B.Tech Computer Science", "joined\_on": "2024-01-15" }

Response 201: { "id": "uuid", "employee\_code": "EMP001", "ldap\_username": "john.doe", "full\_name": "John Doe", "email": "john.doe@company.com", "status": "ACTIVE", "joined\_on": "2024-01-15" }

Response 400: { "error": "employee\_code already exists" }

Response 400: { "error": "ldap\_username already exists" }

Response 403: { "error": "Access denied" }

---

### **GET /api/employees/list**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?status=ACTIVE\&department\_id=uuid\&page=1\&limit=20

Data Filtering:

* employee: Returns list (id, employee\_code, full\_name, email, employee\_design only)  
* project\_manager: Returns list (id, employee\_code, full\_name, email, employee\_design only)  
* hr\_executive: Returns full data

Response 200 (employee/project\_manager): { "employees": \[ { "id": "uuid", "employee\_code": "EMP001", "full\_name": "John Doe", "email": "john.doe@company.com", "employee\_design": "Senior Engineer" } \], "total": 150, "page": 1, "limit": 20 }

Response 200 (hr\_executive): { "employees": \[ { "id": "uuid", "employee\_code": "EMP001", "ldap\_username": "john.doe", "full\_name": "John Doe", "email": "john.doe@company.com", "employee\_type": "Full-Time", "employee\_role": "employee" | "project\_manager" | "hr\_executive", "employee\_design": "Senior Engineer", "working\_location": "Hyderabad", "department\_id": "uuid", "project\_manager\_id": "uuid", "status": "ACTIVE", "joined\_on": "2024-01-15", "exited\_on": null } \], "total": 150, "page": 1, "limit": 20 }

---

### **GET /api/employees/get**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?id=uuid

Data Filtering:

* employee: Can view WHERE id \= current\_user\_id  
* project\_manager: Can view WHERE id \= current\_user\_id OR id IN (SELECT emp\_id FROM project\_allocation WHERE project\_id IN (SELECT id FROM projects WHERE project\_manager\_id \= current\_user\_id))  
* hr\_executive: Can view any employee

Response 200: { "id": "uuid", "employee\_code": "EMP001", "ldap\_username": "john.doe", "full\_name": "John Doe", "email": "john.doe@company.com", "employee\_type": "Full-Time", "employee\_role": "employee" | "project\_manager" | "hr\_executive", "employee\_design": "Senior Engineer", "working\_location": "Hyderabad", "department\_id": "uuid", "project\_manager\_id": "uuid", "experience\_years": 5, "resume\_url": "[https://storage.company.com/resumes/EMP001.pdf](https://storage.company.com/resumes/EMP001.pdf)", "college": "IIT Delhi", "degree": "B.Tech Computer Science", "status": "ACTIVE", "joined\_on": "2024-01-15", "exited\_on": null }

Response 403: { "error": "Access denied" }

Response 404: { "error": "Employee not found" }

---

### **PUT /api/employees/update**

Allowed Roles: hr\_executive

Request: { "id": "uuid", "full\_name": "John Doe Updated", "email": "john.updated@company.com", "employee\_type": "Full-Time", "employee\_role": "employee" | "project\_manager" | "hr\_executive", "employee\_design": "Lead Engineer", "working\_location": "Remote", "department\_id": "uuid", "project\_manager\_id": "uuid", "experience\_years": 6, "resume\_url": "[https://storage.company.com/resumes/EMP001\_v2.pdf](https://storage.company.com/resumes/EMP001_v2.pdf)", "college": "IIT Delhi", "degree": "B.Tech Computer Science" }

Response 200: { "id": "uuid", "employee\_code": "EMP001", "full\_name": "John Doe Updated", "email": "john.updated@company.com", "employee\_design": "Lead Engineer" }

Response 400: { "error": "Cannot update employee\_code" }

Response 400: { "error": "Cannot update ldap\_username" }

Response 403: { "error": "Access denied" }

---

### **POST /api/employees/exit**

Allowed Roles: hr\_executive

Request: { "id": "uuid", "exited\_on": "2026-01-20" }

Response 200: { "id": "uuid", "employee\_code": "EMP001", "status": "EXITED", "exited\_on": "2026-01-20", "allocations\_ended": 3, "tasks\_cancelled": 5 }

Response 400: { "error": "exited\_on must be \>= joined\_on" }

Response 400: { "error": "Employee has active allocations with end\_date after exited\_on" }

Response 403: { "error": "Access denied" }

---

## **Departments (2 endpoints)**

### **GET /api/departments/list**

Allowed Roles: employee, project\_manager, hr\_executive

Response 200: { "departments": \[ { "id": "uuid", "name": "Engineering", "designations": "Junior Engineer,Senior Engineer,Lead Engineer,Principal Engineer" }, { "id": "uuid", "name": "Design", "designations": "UI Designer,UX Designer,Design Lead" } \] }

---

### **POST /api/departments/create**

Allowed Roles: hr\_executive

Request: { "name": "Engineering", "designations": "Junior Engineer,Senior Engineer,Lead Engineer" }

Response 201: { "id": "uuid", "name": "Engineering", "designations": "Junior Engineer,Senior Engineer,Lead Engineer" }

Response 400: { "error": "Department name already exists" }

Response 403: { "error": "Access denied" }

---

## **Clients (3 endpoints)**

### **GET /api/clients/list**

Allowed Roles: employee, project\_manager, hr\_executive

Response 200: { "clients": \[ { "id": "uuid", "client\_name": "Acme Corp", "created\_at": "2026-01-15" } \] }

---

### **POST /api/clients/create**

Allowed Roles: hr\_executive

Request: { "client\_name": "Acme Corp" }

Response 201: { "id": "uuid", "client\_name": "Acme Corp", "created\_at": "2026-01-20" }

Response 400: { "error": "client\_name already exists" }

Response 403: { "error": "Access denied" }

---

### **GET /api/clients/get**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?id=uuid

Response 200: { "id": "uuid", "client\_name": "Acme Corp", "created\_at": "2026-01-15", "projects": \[ { "id": "uuid", "project\_code": "PR-001", "project\_name": "E-commerce Platform" } \] }

Response 404: { "error": "Client not found" }

---

## **Projects (6 endpoints)**

### **POST /api/projects/create**

Allowed Roles: hr\_executive

Request: { "project\_code": "PR-001", "project\_name": "E-commerce Platform", "client\_id": "uuid", "project\_manager\_id": "uuid", "started\_on": "2026-01-20" }

Response 201: { "id": "uuid", "project\_code": "PR-001", "project\_name": "E-commerce Platform", "client\_id": "uuid", "project\_manager\_id": "uuid", "status": "DRAFT", "started\_on": "2026-01-20" }

Response 400: { "error": "project\_code already exists" }

Response 403: { "error": "Access denied" }

---

### **GET /api/projects/list**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?status=ACTIVE\&project\_manager\_id=uuid\&page=1\&limit=20

Data Filtering:

* employee: Returns all projects  
* project\_manager: Returns all projects  
* hr\_executive: Returns all projects

Response 200: { "projects": \[ { "id": "uuid", "project\_code": "PR-001", "project\_name": "E-commerce Platform", "client\_id": "uuid", "client\_name": "Acme Corp", "project\_manager\_id": "uuid", "project\_manager\_name": "Jane Smith", "status": "ACTIVE", "started\_on": "2026-01-20", "closed\_on": null } \], "total": 45, "page": 1, "limit": 20 }

---

### **GET /api/projects/get**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?id=uuid

Data Filtering:

* employee: Can view WHERE id IN (SELECT project\_id FROM project\_allocation WHERE emp\_id \= current\_user\_id)  
* project\_manager: Can view WHERE project\_manager\_id \= current\_user\_id  
* hr\_executive: Can view any project

Response 200: { "id": "uuid", "project\_code": "PR-001", "project\_name": "E-commerce Platform", "client\_id": "uuid", "client\_name": "Acme Corp", "short\_description": "Build e-commerce platform", "long\_description": "Full-featured e-commerce platform with payment integration", "pitch\_deck\_url": "[https://storage.company.com/pitches/PR-001.pdf](https://storage.company.com/pitches/PR-001.pdf)", "github\_url": "[https://github.com/company/ecommerce](https://github.com/company/ecommerce)", "project\_manager\_id": "uuid", "project\_manager\_name": "Jane Smith", "status": "ACTIVE", "started\_on": "2026-01-20", "closed\_on": null }

Response 403: { "error": "Access denied" }

Response 404: { "error": "Project not found" }

---

### **PUT /api/projects/update**

Allowed Roles: project\_manager, hr\_executive

Request (project\_manager): { "id": "uuid", "short\_description": "Updated description", "long\_description": "Updated long description", "pitch\_deck\_url": "[https://storage.company.com/pitches/PR-001-v2.pdf](https://storage.company.com/pitches/PR-001-v2.pdf)", "github\_url": "[https://github.com/company/ecommerce-v2](https://github.com/company/ecommerce-v2)", "status": "ACTIVE" }

Request (hr\_executive): { "id": "uuid", "project\_name": "E-commerce Platform v2", "client\_id": "uuid", "short\_description": "Updated description", "long\_description": "Updated long description", "pitch\_deck\_url": "[https://storage.company.com/pitches/PR-001-v2.pdf](https://storage.company.com/pitches/PR-001-v2.pdf)", "github\_url": "[https://github.com/company/ecommerce-v2](https://github.com/company/ecommerce-v2)", "project\_manager\_id": "uuid", "status": "ACTIVE", "started\_on": "2026-01-20" }

Validation (project\_manager):

* Can update WHERE project\_manager\_id \= current\_user\_id  
* Can update ONLY: short\_description, long\_description, pitch\_deck\_url, github\_url, status  
* Cannot update: project\_code, project\_name, client\_id, project\_manager\_id, started\_on  
* Status transitions allowed: DRAFT→ACTIVE, ACTIVE→ON\_HOLD, ON\_HOLD→ACTIVE  
* Cannot transition to COMPLETED or CANCELLED

Validation (hr\_executive):

* Can update all fields  
* Cannot update project\_code  
* All status transitions allowed

Response 200: { "id": "uuid", "project\_code": "PR-001", "project\_name": "E-commerce Platform v2", "status": "ACTIVE" }

Response 400: { "error": "Cannot update project\_code" }

Response 400: { "error": "Invalid status transition from DRAFT to COMPLETED" }

Response 403: { "error": "Access denied. Not your project" }

Response 403: { "error": "Cannot update project\_name. HR only" }

---

### **POST /api/projects/close**

Allowed Roles: hr\_executive

Request: { "id": "uuid", "status": "COMPLETED", "closed\_on": "2026-06-20" }

Response 200: { "id": "uuid", "project\_code": "PR-001", "status": "COMPLETED", "closed\_on": "2026-06-20", "allocations\_ended": 5 }

Response 400: { "error": "status must be COMPLETED or CANCELLED" }

Response 400: { "error": "Project has active allocations with end\_date after closed\_on" }

Response 403: { "error": "Access denied" }

---

### **GET /api/projects/status-transitions**

Allowed Roles: project\_manager, hr\_executive

Query Parameters: ?current\_status=DRAFT\&role=project\_manager

Response 200: { "current\_status": "DRAFT", "allowed\_transitions": \["ACTIVE"\] }

Response 200 (status=ACTIVE, role=project\_manager): { "current\_status": "ACTIVE", "allowed\_transitions": \["ON\_HOLD"\] }

Response 200 (status=ACTIVE, role=hr\_executive): { "current\_status": "ACTIVE", "allowed\_transitions": \["ON\_HOLD", "COMPLETED", "CANCELLED"\] }

---

## **Phases (4 endpoints)**

### **POST /api/phases/create**

Allowed Roles: project\_manager, hr\_executive

Request: { "project\_id": "uuid", "phase\_name": "Phase 1: Design", "phase\_description": "Complete UI/UX design and prototypes" }

Validation:

* project\_manager: Can create WHERE project\_id IN (SELECT id FROM projects WHERE project\_manager\_id \= current\_user\_id)  
* hr\_executive: Can create for any project

Response 201: { "id": "uuid", "project\_id": "uuid", "phase\_name": "Phase 1: Design", "phase\_description": "Complete UI/UX design and prototypes", "created\_at": "2026-01-20" }

Response 403: { "error": "Access denied. Not your project" }

---

### **GET /api/phases/list**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?project\_id=uuid

Data Filtering:

* employee: Returns WHERE project\_id IN (SELECT project\_id FROM project\_allocation WHERE emp\_id \= current\_user\_id)  
* project\_manager: Returns WHERE project\_id IN (SELECT id FROM projects WHERE project\_manager\_id \= current\_user\_id)  
* hr\_executive: Returns all phases

Response 200: { "phases": \[ { "id": "uuid", "project\_id": "uuid", "project\_code": "PR-001", "project\_name": "E-commerce Platform", "phase\_name": "Phase 1: Design", "phase\_description": "Complete UI/UX design and prototypes", "created\_at": "2026-01-20" } \] }

Response 403: { "error": "Access denied" }

---

### **PUT /api/phases/update**

Allowed Roles: project\_manager, hr\_executive

Request: { "id": "uuid", "phase\_name": "Phase 1: Design (Updated)", "phase\_description": "Updated description" }

Validation:

* project\_manager: Can update WHERE project\_id IN (SELECT id FROM projects WHERE project\_manager\_id \= current\_user\_id)  
* hr\_executive: Can update any phase

Response 200: { "id": "uuid", "phase\_name": "Phase 1: Design (Updated)", "phase\_description": "Updated description" }

Response 403: { "error": "Access denied" }

---

### **POST /api/phase-reports/create**

Allowed Roles: project\_manager, hr\_executive

Request: { "phase\_id": "uuid", "content": "Phase completed successfully. All designs approved." }

Validation:

* project\_manager: Can create WHERE phase\_id IN (SELECT id FROM phase WHERE project\_id IN (SELECT id FROM projects WHERE project\_manager\_id \= current\_user\_id))  
* hr\_executive: Can create for any phase

Response 201: { "id": "uuid", "phase\_id": "uuid", "content": "Phase completed successfully. All designs approved.", "submitted\_by": "uuid", "submitted\_at": "2026-01-20" }

Response 403: { "error": "Access denied" }

### **PUT /api/phase-reports/update**

Allowed Roles: hr\_executive

---

## **Allocations (4 endpoints)**

### **POST /api/allocations/create**

Allowed Roles: hr\_executive

Request: { "emp\_id": "uuid", "project\_id": "uuid", "role": "Backend Developer", "allocation\_percentage": 50.00, "start\_date": "2026-01-20", "end\_date": "2026-06-20", "billability": true, "is\_critical\_resource": false }

Response 201: { "id": "uuid", "emp\_id": "uuid", "project\_id": "uuid", "role": "Backend Developer", "allocation\_percentage": 50.00, "start\_date": "2026-01-20", "end\_date": "2026-06-20", "billability": true, "is\_critical\_resource": false, "assigned\_by": "uuid" }

Response 400: { "error": "Employee allocation exceeds 100%. Current: 70%, Requested: 50%, Total: 120%" }

Response 400: { "error": "end\_date must be \>= start\_date" }

Response 403: { "error": "Access denied" }

---

### **GET /api/allocations/list**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?emp\_id=uuid\&project\_id=uuid\&active\_only=true\&page=1\&limit=20

Data Filtering:

* employee: Returns WHERE emp\_id \= current\_user\_id  
* project\_manager: Returns WHERE project\_id IN (SELECT id FROM projects WHERE project\_manager\_id \= current\_user\_id)  
* hr\_executive: Returns all allocations

active\_only=true filters: WHERE start\_date \<= CURRENT\_DATE AND (end\_date IS NULL OR end\_date \>= CURRENT\_DATE)

Response 200: { "allocations": \[ { "id": "uuid", "emp\_id": "uuid", "employee\_code": "EMP001", "employee\_name": "John Doe", "project\_id": "uuid", "project\_code": "PR-001", "project\_name": "E-commerce Platform", "role": "Backend Developer", "allocation\_percentage": 50.00, "start\_date": "2026-01-20", "end\_date": "2026-06-20", "billability": true, "is\_critical\_resource": false, "assigned\_by": "uuid" } \], "total": 200, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

### **PUT /api/allocations/update**

Allowed Roles: hr\_executive

Request: { "id": "uuid", "allocation\_percentage": 75.00, "end\_date": "2026-08-20", "billability": false, "is\_critical\_resource": true }

Response 200: { "id": "uuid", "allocation\_percentage": 75.00, "end\_date": "2026-08-20", "billability": false, "is\_critical\_resource": true }

Response 400: { "error": "Updated allocation exceeds 100%. Current other: 50%, Requested: 75%, Total: 125%" }

Response 403: { "error": "Access denied" }

---

### **POST /api/allocations/transfer**

Allowed Roles: hr\_executive

Request: { "allocation\_id": "uuid", "new\_project\_id": "uuid", "transfer\_date": "2026-02-01" }

Logic:

1. Update old allocation: SET end\_date \= transfer\_date  
2. Create new allocation: Same emp\_id, role, allocation\_percentage, billability, is\_critical\_resource; start\_date \= transfer\_date; project\_id \= new\_project\_id

Response 200: { "old\_allocation": { "id": "uuid", "end\_date": "2026-02-01" }, "new\_allocation": { "id": "uuid", "emp\_id": "uuid", "project\_id": "uuid", "role": "Backend Developer", "allocation\_percentage": 50.00, "start\_date": "2026-02-01", "end\_date": "2026-06-20", "billability": true, "is\_critical\_resource": false, "assigned\_by": "uuid" } }

Response 400: { "error": "transfer\_date must be between start\_date and end\_date" }

Response 403: { "error": "Access denied" }

---

## **Reports (4 endpoints)**

### **POST /api/reports/create**

Allowed Roles: employee, project\_manager, hr\_executive

Request (Full-Time \- WEEKLY): { "emp\_id": "uuid", "report\_type": "WEEKLY", "week\_start\_date": "2026-01-13", "week\_end\_date": "2026-01-17", "content": "\#\# Accomplishments\\n- Completed authentication module\\n- Fixed 3 bugs", "weekly\_hours": { "PR-001": 40, "PR-002": 10 } }

Request (Intern NOT on projects \- DAILY): { "emp\_id": "uuid", "report\_type": "DAILY", "report\_date": "2026-01-20", "content": "\#\# Today's Work\\n- Attended onboarding\\n- Setup development environment", "weekly\_hours": null }

Validation:

* All roles: Can create WHERE emp\_id \= current\_user\_id  
* Full-Time employees: report\_type must be WEEKLY  
* Interns on projects: report\_type must be WEEKLY  
* Interns NOT on projects: report\_type must be DAILY  
* report\_date must be NULL on creation (DRAFT status)

Response 201: { "id": "uuid", "emp\_id": "uuid", "report\_type": "WEEKLY", "report\_date": null, "week\_start\_date": "2026-01-13", "week\_end\_date": "2026-01-17", "content": "\#\# Accomplishments\\n- Completed authentication module\\n- Fixed 3 bugs", "weekly\_hours": { "PR-001": 40, "PR-002": 10 }, "created\_at": "2026-01-20" }

Response 400: { "error": "Report already exists for this employee and date range" }

Response 403: { "error": "Access denied. Cannot create reports for other employees" }

---

### **GET /api/reports/list**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?emp\_id=uuid\&report\_type=WEEKLY\&week\_start\_date=2026-01-01\&week\_end\_date=2026-01-31\&status=DRAFT\&page=1\&limit=20

status parameter values:

* DRAFT: WHERE report\_date IS NULL  
* SUBMITTED: WHERE report\_date IS NOT NULL

Data Filtering:

* employee: Returns WHERE emp\_id \= current\_user\_id  
* project\_manager: Returns WHERE emp\_id IN (SELECT emp\_id FROM project\_allocation WHERE project\_id IN (SELECT id FROM projects WHERE project\_manager\_id \= current\_user\_id)) OR emp\_id \= current\_user\_id  
* hr\_executive: Returns all reports

Response 200: { "reports": \[ { "id": "uuid", "emp\_id": "uuid", "employee\_code": "EMP001", "employee\_name": "John Doe", "report\_type": "WEEKLY", "report\_date": "2026-01-20", "week\_start\_date": "2026-01-13", "week\_end\_date": "2026-01-17", "content": "\#\# Accomplishments\\n- Completed authentication module", "weekly\_hours": { "PR-001": 40, "PR-002": 10 }, "status": "SUBMITTED", "created\_at": "2026-01-20" } \], "total": 50, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

### **GET /api/reports/get**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?id=uuid

Data Filtering:

* employee: Can view WHERE emp\_id \= current\_user\_id  
* project\_manager: Can view WHERE emp\_id IN team OR emp\_id \= current\_user\_id  
* hr\_executive: Can view any report

Response 200: { "id": "uuid", "emp\_id": "uuid", "employee\_code": "EMP001", "employee\_name": "John Doe", "report\_type": "WEEKLY", "report\_date": "2026-01-20", "week\_start\_date": "2026-01-13", "week\_end\_date": "2026-01-17", "content": "\#\# Accomplishments\\n- Completed authentication module\\n- Fixed 3 bugs", "weekly\_hours": { "PR-001": 40, "PR-002": 10 }, "status": "SUBMITTED", "created\_at": "2026-01-20" }

Response 403: { "error": "Access denied" }

Response 404: { "error": "Report not found" }

---

### **PUT /api/reports/update**

Allowed Roles: hr\_executive

Request: { "id": "uuid", "content": "\#\# Updated Accomplishments\\n- Completed authentication module\\n- Fixed 5 bugs", "weekly\_hours": { "PR-001": 45, "PR-002": 5 }, "report\_date": "2026-01-20" }

Validation:

* hr\_executive: Can update any report

Submit report (change DRAFT to SUBMITTED):

* Set report\_date to current date  
* Once report\_date is set, employee/project\_manager cannot edit

Response 200: { "id": "uuid", "emp\_id": "uuid", "content": "\#\# Updated Accomplishments\\n- Completed authentication module\\n- Fixed 5 bugs", "report\_date": "2026-01-20", "status": "SUBMITTED" }

Response 403: { "error": "Access denied. Cannot update submitted reports" }

Response 403: { "error": "Access denied. Cannot update reports for other employees" }

## **Daily Logs**

### **POST /api/logs/daily**

Allowed Roles: employee, project\_manager, hr\_executive

Request:

{  
   "project\_id": "uuid",  
   "log\_date": "YYYY-MM-DD",  
   "hours": 8,  
   "notes": "Worked on feature X"  
 }

Rules: \- log\_date must be within current work week (Monday–Friday) \- log\_date cannot be future \- log\_date cannot be locked

Response 201:

{ "id": "uuid", "log\_date": "YYYY-MM-DD", "hours": 8 }

---

### **GET /api/logs/daily**

Query:

?current\_week=true

Response 200:

{  
   "logs": \[  
 	{ "project\_id": "uuid", "log\_date": "YYYY-MM-DD", "hours": 8 }  
   \]  
 }

---

## **Weekly Report Submission**

### **POST /api/reports/submit-weekly**

Allowed Roles: employee, project\_manager, hr\_executive

Request:

{  
   "content": "Weekly progress report"  
 }

System assigns: \- week\_start\_date \- week\_end\_date \- weekly\_hours (aggregated from Daily\_Project\_Logs)

Rules: \- Submission allowed only Monday–Friday \- Submission blocked after Friday 23:59 \- Only one report per employee per week

Response 201:

{

  "id": "uuid",

  "week\_start\_date": "YYYY-MM-DD",

  "week\_end\_date": "YYYY-MM-DD",

  "weekly\_hours": { "PRJ01": 40 }

}

---

## **Demands (3 endpoints)**

### **POST /api/demands/create**

Allowed Roles: project\_manager, hr\_executive

Request: { "project\_id": "uuid", "role\_required": "Frontend Developer", "skill\_ids": \["uuid1", "uuid2", "uuid3"\], "start\_date": "2026-02-01", "end\_date": "2026-08-01" }

Validation:

* project\_manager: Can create WHERE project\_id IN (SELECT id FROM projects WHERE project\_manager\_id \= current\_user\_id)  
* hr\_executive: Can create for any project

Response 201: { "id": "uuid", "project\_id": "uuid", "project\_code": "PR-001", "role\_required": "Frontend Developer", "skill\_ids": \["uuid1", "uuid2", "uuid3"\], "start\_date": "2026-02-01", "end\_date": "2026-08-01", "requested\_by": "uuid", "status": "REQUESTED" }

Response 400: { "error": "end\_date must be \>= start\_date" }

Response 403: { "error": "Access denied. Cannot create demand for projects you don't manage" }

---

### **GET /api/demands/list**

Allowed Roles: project\_manager, hr\_executive

Query Parameters: ?project\_id=uuid\&status=REQUESTED\&requested\_by=uuid\&page=1\&limit=20

Data Filtering:

* project\_manager: Returns WHERE requested\_by \= current\_user\_id  
* hr\_executive: Returns all demands

Response 200: { "demands": \[ { "id": "uuid", "project\_id": "uuid", "project\_code": "PR-001", "project\_name": "E-commerce Platform", "role\_required": "Frontend Developer", "skills": \[ { "skill\_id": "uuid1", "skill\_name": "React" }, { "skill\_id": "uuid2", "skill\_name": "TypeScript" } \], "start\_date": "2026-02-01", "end\_date": "2026-08-01", "requested\_by": "uuid", "requested\_by\_name": "Jane Smith", "status": "REQUESTED" } \], "total": 15, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

### **PUT /api/demands/update**

Allowed Roles: project\_manager, hr\_executive

Request (project\_manager \- while status=REQUESTED): { "id": "uuid", "role\_required": "Senior Frontend Developer", "skill\_ids": \["uuid1", "uuid2", "uuid3", "uuid4"\], "end\_date": "2026-09-01" }

Request (hr\_executive \- status change): { "id": "uuid", "status": "FULFILLED" }

Validation:

* project\_manager: Can update WHERE requested\_by \= current\_user\_id AND status \= 'REQUESTED'  
* project\_manager: Cannot change status  
* hr\_executive: Can update any demand  
* hr\_executive: Can change status to FULFILLED or CANCELLED

Response 200: { "id": "uuid", "role\_required": "Senior Frontend Developer", "status": "FULFILLED" }

Response 403: { "error": "Access denied. Cannot edit demand after HR review" }

Response 403: { "error": "Access denied. Cannot change demand status" }

---

## **Tasks (3 endpoints)**

### **POST /api/tasks/create**

Allowed Roles: project\_manager, hr\_executive

Request: { "owner\_id": "uuid", "entity\_id": "uuid", "entity\_type": "PROJECT", "description": "Complete project documentation", "due\_on": "2026-01-25" }

Validation:

* project\_manager: Can create WHERE owner\_id IN (SELECT emp\_id FROM project\_allocation WHERE project\_id IN (SELECT id FROM projects WHERE project\_manager\_id \= current\_user\_id))  
* hr\_executive: Can create for any employee

Response 201: { "id": "uuid", "owner\_id": "uuid", "entity\_id": "uuid", "entity\_type": "PROJECT", "description": "Complete project documentation", "status": "DUE", "due\_on": "2026-01-25", "assigned\_by": "uuid", "created\_at": "2026-01-20" }

Response 403: { "error": "Access denied. Cannot assign tasks to non-team members" }

---

### **GET /api/tasks/list**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?owner\_id=uuid\&status=DUE\&entity\_type=PROJECT\&page=1\&limit=20

Data Filtering:

* employee: Returns WHERE owner\_id \= current\_user\_id  
* project\_manager: Returns WHERE owner\_id IN team OR owner\_id \= current\_user\_id  
* hr\_executive: Returns all tasks

Response 200: { "tasks": \[ { "id": "uuid", "owner\_id": "uuid", "owner\_name": "John Doe", "entity\_id": "uuid", "entity\_type": "PROJECT", "description": "Complete project documentation", "status": "DUE", "due\_on": "2026-01-25", "assigned\_by": "uuid", "assigned\_by\_name": "Jane Smith", "created\_at": "2026-01-20" } \], "total": 10, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

### **POST /api/tasks/complete**

Allowed Roles: employee, project\_manager, hr\_executive

Request: { "id": "uuid" }

Validation:

* employee: Can complete WHERE owner\_id \= current\_user\_id  
* project\_manager: Can complete WHERE owner\_id \= current\_user\_id  
* hr\_executive: Can complete any task

Response 200: { "id": "uuid", "status": "COMPLETED", "completed\_at": "2026-01-20" }

Response 403: { "error": "Access denied. Cannot complete tasks assigned to other employees" }

---

## **Skills (5 endpoints)**

### **POST /api/skills/add**

Allowed Roles: hr\_executive

Request: { "skill\_name": "React", "department\_id": "uuid" }

Response 201: { "skill\_id": "uuid", "skill\_name": "React", "department\_id": "uuid", "created\_at": "2026-01-20" }

Response 400: { "error": "Skill name already exists" }

Response 403: { "error": "Access denied" }

---

### **GET /api/skills/list**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?department\_id=uuid\&page=1\&limit=50

Response 200: { "skills": \[ { "skill\_id": "uuid", "skill\_name": "React", "department\_id": "uuid", "department\_name": "Engineering", "created\_at": "2026-01-20" } \], "total": 120, "page": 1, "limit": 50 }

---

### **POST /api/skills/request**

Allowed Roles: employee, project\_manager, hr\_executive

Request: { "emp\_id": "uuid", "skill\_id": "uuid", "proficiency\_level": "advanced" }

Validation:

* All roles: Can request WHERE emp\_id \= current\_user\_id

Response 201: { "skill\_id": "uuid", "emp\_id": "uuid", "skill\_name": "React", "proficiency\_level": "advanced", "approved\_by": null, "approved\_at": null, "status": "PENDING" }

Response 400: { "error": "Skill already exists for this employee" }

Response 403: { "error": "Access denied. Cannot request skills for other employees" }

---

### **POST /api/skills/approve**

Allowed Roles: project\_manager, hr\_executive

Request: { "emp\_id": "uuid", "skill\_id": "uuid" }

Validation:

* project\_manager: Can approve WHERE emp\_id IN (SELECT emp\_id FROM project\_allocation WHERE project\_id IN (SELECT id FROM projects WHERE project\_manager\_id \= current\_user\_id))  
* hr\_executive: Can approve for any employee

Response 200: { "skill\_id": "uuid", "emp\_id": "uuid", "skill\_name": "React", "proficiency\_level": "advanced", "approved\_by": "uuid", "approved\_at": "2026-01-20", "status": "APPROVED" }

Response 403: { "error": "Access denied. Cannot approve skills for non-team members" }

Response 404: { "error": "Skill request not found" }

---

### **POST /api/skills/reject**

Allowed Roles: project\_manager, hr\_executive

Request: { "emp\_id": "uuid", "skill\_id": "uuid" }

Validation:

* project\_manager: Can reject WHERE emp\_id IN team  
* hr\_executive: Can reject for any employee

Logic: DELETE FROM employee\_skills WHERE emp\_id \= ? AND skill\_id \= ?

Response 200: { "message": "Skill request rejected and deleted" }

Response 403: { "error": "Access denied. Cannot reject skills for non-team members" }

---

## **Approvals (1 endpoint)**

### **GET /api/approvals/list**

Allowed Roles: project\_manager, hr\_executive

Query Parameters: ?type=skill\&page=1\&limit=20

type parameter values:

* skill: Returns pending skill requests  
* demand: Returns pending demands (REQUESTED status)

Data Filtering:

* project\_manager:  
  * skill type: Returns WHERE emp\_id IN team AND approved\_by IS NULL  
  * demand type: Not accessible  
* hr\_executive:  
  * skill type: Returns all WHERE approved\_by IS NULL  
  * demand type: Returns all WHERE status \= 'REQUESTED'

Response 200 (type=skill): { "approvals": \[ { "id": "uuid", "type": "skill", "emp\_id": "uuid", "employee\_code": "EMP001", "employee\_name": "John Doe", "skill\_id": "uuid", "skill\_name": "React", "proficiency\_level": "advanced", "requested\_at": "2026-01-20" } \], "total": 25, "page": 1, "limit": 20 }

Response 200 (type=demand): { "approvals": \[ { "id": "uuid", "type": "demand", "project\_id": "uuid", "project\_code": "PR-001", "project\_name": "E-commerce Platform", "role\_required": "Frontend Developer", "requested\_by": "uuid", "requested\_by\_name": "Jane Smith", "start\_date": "2026-02-01", "end\_date": "2026-08-01", "status": "REQUESTED" } \], "total": 10, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

## **Audit (1 endpoint)**

### **GET /api/audit/list**

Allowed Roles: hr\_executive

Query Parameters: ?entity\_type=EMPLOYEE\&entity\_id=uuid\&operation=UPDATE\&changed\_by=uuid\&start\_date=2026-01-01\&end\_date=2026-01-31\&page=1\&limit=20

Response 200: { "audits": \[ { "id": "uuid", "entity\_id": "uuid", "entity\_type": "EMPLOYEE", "row\_id": "uuid", "operation": "UPDATE", "changed\_by": "uuid", "changed\_by\_name": "HR Admin", "changed\_at": "2026-01-20", "changed\_fields": { "status": { "old": "ACTIVE", "new": "EXITED" }, "exited\_on": { "old": null, "new": "2026-01-20" } } } \], "total": 500, "page": 1, "limit": 20 }

Response 403: { "error": "Access denied" }

---

## **Employee Skills (2 endpoints)**

### **GET /api/employee-skills/list**

Allowed Roles: employee, project\_manager, hr\_executive

Query Parameters: ?emp\_id=uuid\&status=APPROVED\&page=1\&limit=50

status parameter values:

* PENDING: WHERE approved\_by IS NULL AND approved\_at IS NULL  
* APPROVED: WHERE approved\_by IS NOT NULL AND approved\_at IS NOT NULL

Data Filtering:

* employee: Returns WHERE emp\_id \= current\_user\_id  
* project\_manager: Returns WHERE emp\_id IN team OR emp\_id \= current\_user\_id  
* hr\_executive: Returns all employee skills

Response 200: { "employee\_skills": \[ { "skill\_id": "uuid", "skill\_name": "React", "emp\_id": "uuid", "employee\_code": "EMP001", "employee\_name": "John Doe", "proficiency\_level": "advanced", "approved\_by": "uuid", "approved\_by\_name": "HR Admin", "approved\_at": "2026-01-20", "status": "APPROVED" } \], "total": 50, "page": 1, "limit": 50 }

Response 403: { "error": "Access denied" }

---

### **DELETE /api/employee-skills/delete**

Allowed Roles: employee, project\_manager, hr\_executive

Request: { "emp\_id": "uuid", "skill\_id": "uuid" }

Validation:

* employee: Can delete WHERE emp\_id \= current\_user\_id AND approved\_by IS NULL  
* project\_manager: Can delete WHERE emp\_id \= current\_user\_id AND approved\_by IS NULL  
* hr\_executive: Can delete any employee skill

Response 200: { "message": "Employee skill deleted successfully" }

Response 403: { "error": "Access denied. Cannot delete approved skills" }

Response 403: { "error": "Access denied. Cannot delete skills for other employees" }

---

## **RBAC Summary**

| Endpoint | employee | project\_manager | hr\_executive |
| ----- | ----- | ----- | ----- |
| POST /api/auth/login | ✅ | ✅ | ✅ |
| POST /api/auth/logout | ✅ | ✅ | ✅ |
| GET /api/auth/me | ✅ | ✅ | ✅ |
| POST /api/employees/create | ❌ | ❌ | ✅ |
| GET /api/employees/list | ✅ (limited) | ✅ (limited) | ✅ (full) |
| GET /api/employees/get | ✅ (own) | ✅ (own+team) | ✅ (all) |
| PUT /api/employees/update | ❌ | ❌ | ✅ |
| POST /api/employees/exit | ❌ | ❌ | ✅ |
| GET /api/departments/list | ✅ | ✅ | ✅ |
| POST /api/departments/create | ❌ | ❌ | ✅ |
| GET /api/clients/list | ✅ | ✅ | ✅ |
| POST /api/clients/create | ❌ | ❌ | ✅ |
| GET /api/clients/get | ✅ | ✅ | ✅ |
| POST /api/projects/create | ❌ | ❌ | ✅ |
| GET /api/projects/list | ✅ (allocated) | ✅ (managed) | ✅ (all) |
| GET /api/projects/get | ✅ (allocated) | ✅ (managed) | ✅ (all) |
| PUT /api/projects/update | ❌ | ✅ (limited) | ✅ (full) |
| POST /api/projects/close | ❌ | ❌ | ✅ |
| GET /api/projects/status-transitions | ❌ | ✅ | ✅ |
| POST /api/phases/create | ❌ | ✅ (managed) | ✅ (all) |
| GET /api/phases/list | ✅ (allocated) | ✅ (managed) | ✅ (all) |
| PUT /api/phases/update | ❌ | ✅ (managed) | ✅ (all) |
| POST /api/phase-reports/create | ❌ | ✅ (managed) | ✅ (all) |
| POST /api/allocations/create | ❌ | ❌ | ✅ |
| GET /api/allocations/list | ✅ (own) | ✅ (managed) | ✅ (all) |
| PUT /api/allocations/update | ❌ | ❌ | ✅ |
| POST /api/allocations/transfer | ❌ | ❌ | ✅ |
| POST /api/reports/create | ✅ (own) | ✅ (own) | ✅ (own) |
| GET /api/reports/list | ✅ (own) | ✅ (own+team) | ✅ (all) |
| GET /api/reports/get | ✅ (own) | ✅ (own+team) | ✅ (all) |
| PUT /api/reports/update | ✅ (own DRAFT) | ✅ (own DRAFT) | ✅ (all) |
| POST /api/demands/create | ❌ | ✅ (managed) | ✅ (all) |
| GET /api/demands/list | ❌ | ✅ (own) | ✅ (all) |
| PUT /api/demands/update | ❌ | ✅ (own REQUESTED) | ✅ (all) |
| POST /api/tasks/create | ❌ | ✅ (team) | ✅ (all) |
| GET /api/tasks/list | ✅ (own) | ✅ (own+team) | ✅ (all) |
| POST /api/tasks/complete | ✅ (own) | ✅ (own) | ✅ (all) |
| POST /api/skills/add | ❌ | ❌ | ✅ |
| GET /api/skills/list | ✅ | ✅ | ✅ |
| POST /api/skills/request | ✅ (own) | ✅ (own) | ✅ (own) |
| POST /api/skills/approve | ❌ | ✅ (team) | ✅ (all) |
| POST /api/skills/reject | ❌ | ✅ (team) | ✅ (all) |
| GET /api/approvals/list | ❌ | ✅ (team skills) | ✅ (all) |
| GET /api/audit/list | ❌ | ❌ | ✅ |
| GET /api/employee-skills/list | ✅ (own) | ✅ (own+team) | ✅ (all) |
| DELETE /api/employee-skills/delete | ✅ (own PENDING) | ✅ (own PENDING) | ✅ (all) |

---

## **Error Codes**

| Code | Message |
| ----- | ----- |
| 400 | Bad Request \- Invalid input data |
| 401 | Unauthorized \- Invalid or missing token |
| 403 | Forbidden \- Insufficient permissions |
| 404 | Not Found \- Resource does not exist |
| 409 | Conflict \- Duplicate entry |
| 500 | Internal Server Error |

---

## **Pagination**

All list endpoints support pagination:

* Default: page=1, limit=20  
* Maximum limit: 100

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

Key \= project\_code Value \= hours worked (integer or decimal)

---

## **Audit Changed Fields JSON Structure**

{  
  "field\_name": {  
    "old": "previous\_value",  
    "new": "new\_value"  
  }  
}

