# **🔐 ResFlow V2 \- Page Access Matrix**

## **Legend**

* 🟢 **Full Access** \- Create, Read, Update, Delete

* 🟡 **Partial Access** \- Restricted by ownership/team/status

* 🔵 **Read Only** \- View access only

* 🟠 **Conditional Access** \- Based on status/workflow

* 🔴 **No Access** \- Restricted

* 🟣 **Public** \- No authentication required

---

## **Authentication & Public Pages**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /login | 🟣 Public | 🟣 Public | 🟣 Public | Login page |

---

## **Dashboard**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /dashboard | 🔵 View | 🔵 View | 🔵 View | Analytics dashboard |

---

## **Employee Management**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /employees | 🔵 View list | 🔵 View list | 🟢 View list \+ Create \+ Edit \+ Exit | Employee directory |
| /employees/new | 🔴 No access | 🔴 No access | 🟢 Create form | Add new employee |
| /employees/\[id\] | 🟡 View own only | 🟡 View own \+ team | 🔵 View all | Employee profile |
| /employees/\[id\]/edit | 🔴 No access | 🔴 No access | 🟢 Edit form | Edit employee details |

---

## **Project Management**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /projects | 🟡 View allocated only | 🟡 View managed only | 🟢 View all \+ Create \+ Edit \+ Close | Project list |
| /projects/new | 🔴 No access | 🔴 No access | 🟢 Create form (minimal fields) | HR creates: code, name, client, PM, dates |
| /projects/\[id\] | 🟡 View allocated only | 🟡 View managed \+ Edit managed | 🟢 View all \+ Edit all | Project details |
| /projects/\[id\]/edit | 🔴 No access | 🟡 Edit managed (descriptions, URLs, status) | 🟢 Edit all fields | PM completes project info |
| /projects/\[id\]/phases | 🟡 View allocated only | 🟡 View managed \+ Create \+ Edit | 🟢 View all \+ Create \+ Edit | Phase management |

### **Two-Phase Project Creation Workflow**

**Phase 1: HR Creates Project (Minimal Info)**   
\- ✓ project\_code (required, unique)   
\- ✓ project\_name (required)   
\- ✓ client\_id (required)   
\- ✓ project\_manager\_id (required \- assigns PM)   
\- ✓ started\_on (optional) \- Status: DRAFT

**Phase 2: PM Completes Project Details**

**PM Can Edit:**   
\- ✓ short\_description   
\- ✓ long\_description   
\- ✓ pitch\_deck\_url   
\- ✓ github\_url   
\- ✓ status (DRAFT → ACTIVE → ON\_HOLD ↔ ACTIVE)

**PM Cannot Edit (HR Only):**  
\- ✗ project\_code (immutable)   
\- ✗ project\_name \- ✗ client\_id   
\- ✗ project\_manager\_id   
\- ✗ started\_on   
\- ✗ status \= COMPLETED or CANCELLED

---

## **Resource Allocation**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /allocations | 🟡 View own only | 🟡 View managed projects | 🟢 View all \+ Create \+ Edit \+ Transfer | Allocation tracking |
| /allocations/new | 🔴 No access | 🔴 No access | 🟢 Create form | HR assigns resources |
| /allocations/\[id\] | 🟡 View own only | 🟡 View managed projects | 🟢 View all \+ Edit \+ Transfer | Allocation details |

---

## **Daily Work Logs (Project Hours Tracking)**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /logs | 🟡 View own \+ Create own | 🟡 View team \+ Create own | 🟢 View all \+ Create all | Daily hour entry (stored in database) |
| /logs/new | 🟢 Create form | 🟢 Create form | 🟢 Create form | Add daily hours |

---

### **How Logs Work**

For Full-Time Employees:

1\.          Monday–Friday: Enter hours on /logs → Stored in database table Daily\_Project\_Logs

2\.          Friday: Create weekly report → System auto-fills weekly\_hours from Daily\_Project\_Logs

3\.          After submission: logs for that week are locked

For Interns (if assigned to projects):  
 \- Same as full-time employees  
 \- Enter daily hours in database  
 \- Submit weekly report on Friday

---

### **Storage Logic**

\- Daily entries: Stored in database table Daily\_Project\_Logs  
\- Weekly aggregation: Aggregated and stored in weekly\_hours JSON field  
\- Daily logs are locked after weekly report submission

---

## **Reports (Narrative Progress Reports)**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /reports | 🟡 View own \+ Create own | 🟡 View team \+ own \+ Create own | 🟢 View all \+ Create all | Weekly/Daily narrative reports |
| /reports/new | 🟢 Create form | 🟢 Create form | 🟢 Create form | Submit report |
| /reports/\[id\] | 🟡 View own \+ Edit (DRAFT only) | 🟡 View team \+ own \+ Edit (DRAFT only) | 🟢 View all \+ Edit all | Report details |

---

## **Report Types & Workflows**

### **Full-Time Employees**

•             Submit **WEEKLY** reports (report\_type \= 'WEEKLY')

•             Report contains:

–            ✓ content: Narrative in markdown format

–            ✓ weekly\_hours: Auto-filled from Daily\_Project\_Logs

–            ✓ week\_start\_date and week\_end\_date (system assigned)

### **Interns (NOT assigned to projects)**

•             Submit **DAILY** reports (report\_type \= 'DAILY')

•             Report contains:

–            ✓ content: Narrative in markdown format

–            ✓ report\_date: Submission date

–            ✓ weekly\_hours: NULL

### **Interns (ASSIGNED to projects)**

•             Switch to WEEKLY reports (same as full-time)

•             Use /logs for daily hour tracking

•             Report contains narrative \+ accumulated hours

---

## **Work Week Definition**

•             Week start: Monday 00:00

•             Week end: Friday 23:59

•             Calendar-based

•             Global system rule

•             Employee cannot configure

---

## **Submission Rules**

•             One report per employee per week

•             Submission allowed only Monday–Friday

•             Submission blocked after Friday 23:59

•             Editing blocked after submission

•             Backdated logs blocked

•             Future logs blocked

---

## **Status Inference (No Status Column Needed)**

DRAFT Status:  
report\_date **IS NULL**  
SUBMITTED Status:  
report\_date **IS NOT NULL**

---

**Edit Logic**

•             ✓ Owner can edit while report\_date IS NULL (DRAFT)

•             ✓ Once submitted (report\_date set), owner cannot edit

•             ✓ HR can edit submitted reports (creates audit trail)

---

## **Submission Action**

**UPDATE** Reports  
 **SET** report\_date \= CURRENT\_DATE,  
 	content \= '...',  
 	weekly\_hours \= **aggregated from** Daily\_Project\_Logs  
 **WHERE** id \= ? **AND** report\_date **IS NULL**;

---

## **Resource Demands**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /demands | 🔴 No access | 🟡 View own \+ Create | 🟢 View all \+ Review \+ Approve/Reject | Resource requests |
| /demands/new | 🔴 No access | 🟢 Create form | 🟢 Create form | Request resources for projects |
| /demands/\[id\] | 🔴 No access | 🟡 View own \+ Edit (REQUESTED) | 🟢 View all \+ Approve/Reject | Demand details |

### **Demand Workflow**

**Step 1: PM Creates Demand**   
\- Status: REQUESTED   
\- PM can edit while status \= REQUESTED

**Step 2: HR Reviews**   
\- HR views demand details   
\- HR can approve or reject

**Step 3: HR Decision**   
\- ✓ Approve → Status: FULFILLED   
\- ✗ Reject → Status: CANCELLED

**Step 4: Post-Decision**   
\- PM cannot edit after HR reviews   
\- Demand is locked

**Status Values:**

demand\_status\_enum: REQUESTED, FULFILLED, CANCELLED

---

## **Skills Management**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /skills | 🔵 View all \+ Request to add | 🔵 View all \+ Request \+ Approve team | 🟢 View all \+ Add to pool \+ Delete \+ Approve all | Skills catalog & requests |
| /skills/new | 🟡 Request to add to profile | 🟡 Request \+ add to profile | 🟢 Add to pool \+ Add to profile | Add new skill |
| /skills/\[id\]/approve | 🔴 No access | 🟡 Approve for team members | 🟢 Approve for anyone | Skill approval action |

### **Skills Approval Workflow (Request-Based)**

**Step 1: Employee Requests Skill**

**INSERT** **INTO** Employee\_Skills (skill\_id, emp\_id, approved\_by, approved\_at)  
**VALUES** (skill\_id, emp\_id, **NULL**, **NULL**);  
*\-- approved\_by \= NULL, approved\_at \= NULL → PENDING*

**Step 2: PM (for team) or HR Reviews** \- Shows in /approvals page \- Reviewer can approve or reject

**Step 3: Approval Decision**

**If Approved:**

**UPDATE** Employee\_Skills   
**SET** approved\_by \= reviewer\_id,   
    approved\_at \= CURRENT\_DATE  
**WHERE** skill\_id \= ? **AND** emp\_id \= ?;  
*\-- Skill now appears on employee profile as validated*

**If Rejected:**

**DELETE** **FROM** Employee\_Skills   
**WHERE** skill\_id \= ? **AND** emp\_id \= ?;  
*\-- Row deleted entirely, employee can re-request later*

### **Status Inference (No Status Column Needed)**

**function** getSkillStatus(employeeSkill) {  
  **if** (employeeSkill.approved\_by \=== **null** && employeeSkill.approved\_at \=== **null**) {  
    **return** 'PENDING';  
  }  
  **if** (employeeSkill.approved\_by \!== **null** && employeeSkill.approved\_at \!== **null**) {  
    **return** 'APPROVED';  
  }  
}

**No REJECTED status needed** \- rejected requests are deleted from the table.

---

## **Approvals Dashboard**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /approvals | 🔴 No access | 🟡 View pending skills for team | 🟢 View all pending items | Centralized approval center |

### **What Each Role Sees**

**Project Manager:** \- ✓ Pending skill requests from team members \- ✓ Count of pending items

**HR Executive:** \- ✓ All pending skill requests (any employee) \- ✓ All pending demands (from all PMs) \- ✓ Comprehensive approval queue

---

## **Task Management**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /tasks | 🟡 View own \+ Complete own | 🟡 View team \+ Create for team \+ Complete own | 🟢 View all \+ Create all \+ Complete all | Task tracking |
| /tasks/new | 🔴 No access | 🟢 Create for team members | 🟢 Create for anyone | Assign tasks |
| /tasks/\[id\] | 🟡 View own \+ Complete own | 🟡 View assigned/owned \+ Complete own | 🟢 View all \+ Complete all | Task details |

### **Task Assignment Logic**

**Database Fields:** \- owner\_id: Person responsible for completing the task \- assigned\_by: Person who created/assigned the task

**PM Task Creation:**

*// PM can only assign tasks to their team members*  
**async** **function** createTask(data, currentUser) {  
  **if** (currentUser.role \=== 'project\_manager') {  
    *// Check if target employee is in PM's managed projects*  
    **const** isTeamMember \= **await** db.project\_allocation.exists({  
      emp\_id: data.owner\_id,  
      project: {  
        project\_manager\_id: currentUser.id  
      }  
    });

    **if** (\!isTeamMember) {  
      **throw** **new** Error('Can only assign tasks to your team members');  
    }  
  }

  **await** db.tasks.create({  
    ...data,  
    assigned\_by: currentUser.id  
  });  
}

**Task Visibility:**   
\- Employee: Tasks where owner\_id \= current\_user.id   
\- PM: Tasks where owner\_id IN (team\_members) OR assigned\_by \= current\_user.id   
\- HR: All tasks

---

## **Audit Trail**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /audit | 🔴 No access | 🔴 No access | 🔵 View all | System audit logs |

### **What’s Tracked**

**Audit Table Records:**   
\- All CRUD operations (Create, Update, Delete)   
\- Entity type and ID \- Changed by (user ID)   
\- Timestamp   
\- Field-level changes in JSON format

**Example Audit Entry:**

{  
  "entity\_type": "REPORT",  
  "entity\_id": "uuid-123",  
  "operation": "UPDATE",  
  "changed\_by": "hr\_user\_id",  
  "changed\_at": "2026-01-21T10:30:00Z",  
  "changed\_fields": {  
    "content": {  
      "old": "Original content...",  
      "new": "Updated content..."  
    }  
  }  
}

**Use Cases:**   
\- Track who edited submitted reports   
\- Monitor skill approvals/rejections  
\- Review allocation changes   
\- Compliance and investigation

---

## **Settings**

| Page | Employee | Project Manager | HR Executive | Notes |
| :---- | :---- | :---- | :---- | :---- |
| /settings | 🟡 View own \+ Edit own | 🟡 View own \+ Edit own | 🟡 View own \+ Edit own | Personal preferences |

**What Can Be Configured:**   
\- ✓ Display preferences   
\- ✓ Theme (light/dark mode)   
\- ✓ Personal information (within allowed fields)

---

## **Permission Summary by Role**

### **🔵 Employee Role**

**Full Access:**   
\- ✓ View own profile, allocated projects, own tasks   
\- ✓ Create daily work logs (localStorage)   
\- ✓ Create/edit reports (DRAFT state only)   
\- ✓ Request skills for own profile   
\- ✓ Complete assigned tasks

**Partial Access:**   
\- ✓ View employee directory (list only)   
\- ✓ View projects they’re allocated to

**No Access:**   
\- ✗ Other employees’ detailed profiles   
\- ✗ Create projects, allocations, demands, tasks   
\- ✗ Approve anything   
\- ✗ Audit logs   
\- ✗ Edit submitted reports

---

### **🟡 Project Manager Role**

**Everything Employee Has, Plus:**

**Additional Full Access:**  
 \- ✓ Edit managed projects (descriptions, URLs, phases, status)   
\- ✓ Create project phases   
\- ✓ Create demands for managed projects   
\- ✓ Create tasks for team members   
\- ✓ Approve team members’ skill requests

**Additional Partial Access:**   
\- ✓ View team members’ profiles and work   
\- ✓ View all team reports and logs   
\- ✓ Edit demands (before HR reviews)

**Still No Access:**   
\- ✗ Create/edit employees   
\- ✗ Create new projects (HR creates, PM completes)   
\- ✗ Create allocations (HR only)   
\- ✗ View audit logs   
\- ✗ Access projects not managed by them   
\- ✗ Approve demands (only create)

---

### **🟢 HR Executive Role**

**Complete System Control:**

**Full Access to All Modules:**   
\- ✓ All employee management (create, edit, exit, view all)   
\- ✓ All project management (create, assign PM, edit all fields, close)   
\- ✓ All resource allocation (create, edit, transfer)  
\- ✓ All demand approvals (view, approve, reject)   
\- ✓ All skill approvals (any employee)   
\- ✓ Create tasks for anyone   
\- ✓ View all audit logs   
\- ✓ Edit submitted reports/logs (with audit trail)   
\- ✓ Complete all approval workflows

**Special Powers:**   
\- ✓ Override status restrictions (edit locked items)   
\- ✓ Full visibility across all entities and users   
\- ✓ System-wide analytics and reporting   
\- ✓ Compliance and audit access

**Responsibilities:**   
\- ✓ Employee lifecycle management   
\- ✓ Resource planning and allocation   
\- ✓ Approval workflows (demands, skills)   
\- ✓ System integrity and audit compliance   
\- ✓ Final authority on all data changes

---

## **Database Schema Enhancements**

### **1\. Projects Table \- Status Field**

**ALTER** **TABLE** Projects   
**ADD** **COLUMN** status VARCHAR **DEFAULT** 'DRAFT';

*\-- Allowed values: DRAFT, ACTIVE, ON\_HOLD, COMPLETED, CANCELLED*

**Status Transitions:** \- DRAFT → ACTIVE (PM or HR) \- ACTIVE → ON\_HOLD (PM or HR) \- ON\_HOLD → ACTIVE (PM or HR) \- ACTIVE → COMPLETED (HR only) \- \* → CANCELLED (HR only)

---

### **2\. Reports Table \- Already Has report\_date**

**Status Inference:**

*\-- DRAFT status*  
**WHERE** report\_date **IS** **NULL**

*\-- SUBMITTED status*    
**WHERE** report\_date **IS** **NOT** **NULL**

**No additional column needed\!**

---

### **3\. Employee\_Skills \- Already Has Approval Fields**

**Existing Schema:**

approved\_by UUID **REFERENCES** Employees(**id**)  
approved\_at DATE

**Status Inference:**

*\-- PENDING*  
**WHERE** approved\_by **IS** **NULL** **AND** approved\_at **IS** **NULL**

*\-- APPROVED*  
**WHERE** approved\_by **IS** **NOT** **NULL** **AND** approved\_at **IS** **NOT** **NULL**

*\-- REJECTED \= row deleted from table*

**No additional column needed\!**

---

## **Implementation Guidelines**

### **API Route Protection Pattern**

*// Middleware for access control*  
**export** **async** **function** checkAccess(  
  req: Request,  
  resource: string,  
  action: 'view' | 'create' | 'edit' | 'delete',  
  resourceId?: string  
) {  
  **const** user \= **await** getCurrentUser(req);

  *// Check basic role permission*  
  **if** (\!hasRolePermission(user.role, resource, action)) {  
    **throw** **new** UnauthorizedError('No permission for this action');  
  }

  *// Check ownership/scope for partial access*  
  **if** (requiresOwnershipCheck(user.role, resource, action)) {  
    **const** canAccess \= **await** checkOwnership(user, resource, resourceId);  
    **if** (\!canAccess) {  
      **throw** **new** UnauthorizedError('Cannot access this resource');  
    }  
  }

  **return** **true**;  
}

*// Example usage in API route*  
**export** **async** **function** PUT(req: Request, { params }: { params: { id: string } }) {  
  **await** checkAccess(req, 'projects', 'edit', params.id);

  **const** user \= **await** getCurrentUser(req);  
  **const** project \= **await** db.projects.findUnique({ where: { id: params.id } });

  **if** (user.role \=== 'project\_manager') {  
    *// Validate PM is the project manager*  
    **if** (project.project\_manager\_id \!== user.id) {  
      **throw** **new** ForbiddenError('Not your project');  
    }

    *// Restrict editable fields*  
    **const** allowedFields \= \[  
      'short\_description',  
      'long\_description',  
      'pitch\_deck\_url',   
      'github\_url',  
      'status'  
    \];

    **const** updates \= filterFields(**await** req.json(), allowedFields);

    *// Validate status transitions*  
    **if** (updates.status) {  
      validateStatusTransition(project.status, updates.status, user.role);  
    }

    **await** db.projects.update({ where: { id: params.id }, data: updates });  
  } **else** **if** (user.role \=== 'hr\_executive') {  
    *// HR can edit all fields*  
    **await** db.projects.update({ where: { id: params.id }, data: **await** req.json() });  
  }

  **return** Response.json({ success: **true** });  
}

---

### **Frontend Route Guards**

*// middleware.ts*  
**export** **function** middleware(req: NextRequest) {  
  **const** user \= getSessionUser(req);  
  **const** path \= req.nextUrl.pathname;

  *// Public routes*  
  **if** (path \=== '/login') {  
    **return** NextResponse.next();  
  }

  *// Require authentication*  
  **if** (\!user) {  
    **return** NextResponse.redirect(**new** URL('/login', req.url));  
  }

  *// Check role-based access*  
  **if** (\!canAccessRoute(user.role, path)) {  
    **return** NextResponse.redirect(**new** URL('/unauthorized', req.url));  
  }

  **return** NextResponse.next();  
}

**function** canAccessRoute(role: string, path: string): boolean {  
  **const** roleAccess \= {  
    employee: \['/dashboard', '/employees', '/projects', '/tasks', '/logs', '/reports', '/skills', '/settings'\],  
    project\_manager: \['/dashboard', '/employees', '/projects', '/tasks', '/logs', '/reports', '/skills', '/demands', '/allocations', '/approvals', '/settings'\],  
    hr\_executive: \['\*'\] *// All routes*  
  };

  **if** (role \=== 'hr\_executive') **return** **true**;

  **const** allowedRoutes \= roleAccess\[role\] || \[\];  
  **return** allowedRoutes.some(route **\=\>** path.startsWith(route));  
}

---

### **Status Inference Utilities**

*// lib/status-inference.ts*

**export** **function** getReportStatus(report: Report): 'DRAFT' | 'SUBMITTED' {  
  **return** report.report\_date \=== **null** ? 'DRAFT' : 'SUBMITTED';  
}

**export** **function** canEditReport(report: Report, user: User): boolean {  
  **const** status \= getReportStatus(report);

  **if** (status \=== 'SUBMITTED') {  
    *// Only HR can edit submitted reports*  
    **return** user.role \=== 'hr\_executive';  
  }

  *// DRAFT \- owner can edit*  
  **return** report.emp\_id \=== user.id;  
}

**export** **function** getSkillStatus(employeeSkill: EmployeeSkill): 'PENDING' | 'APPROVED' {  
  **if** (employeeSkill.approved\_by \=== **null** && employeeSkill.approved\_at \=== **null**) {  
    **return** 'PENDING';  
  }  
  **return** 'APPROVED';  
}

**export** **function** canApproveSkill(employeeSkill: EmployeeSkill, user: User): boolean {  
  **if** (user.role \=== 'hr\_executive') **return** **true**;

  **if** (user.role \=== 'project\_manager') {  
    *// PM can approve skills for their team members*  
    **return** isInTeam(employeeSkill.emp\_id, user.id);  
  }

  **return** **false**;  
}

---

## **UI/UX Considerations**

### **Status Badges**

**For Reports:**

function ReportStatusBadge({ report }: { report: Report }) {  
  const status \= getReportStatus(report);

  if (status \=== 'DRAFT') {  
    return \<Badge variant="warning"\>Draft\</Badge\>;  
  }  
  return \<Badge variant="success"\>Submitted\</Badge\>;  
}

**For Skills:**

function SkillStatusBadge({ employeeSkill }: { employeeSkill: EmployeeSkill }) {  
  const status \= getSkillStatus(employeeSkill);

  if (status \=== 'PENDING') {  
    return \<Badge variant="warning"\>Pending Approval\</Badge\>;  
  }  
  return \<Badge variant="success"\>Approved\</Badge\>;  
}

---

### **Form State Management**

**Report Creation/Editing:**

function ReportForm({ reportId }: { reportId?: string }) {  
  const \[report, setReport\] \= useState(null);  
  const user \= useCurrentUser();

  const canEdit \= useMemo(() \=\> {  
    if (\!report) return true; // New report  
    return canEditReport(report, user);  
  }, \[report, user\]);

  const handleSubmit \= async (data) \=\> {  
    if (reportId) {  
      // Update existing  
      await fetch(\`/api/reports/${reportId}\`, {  
        method: 'PUT',  
        body: JSON.stringify(data)  
      });  
    } else {  
      // Create new  
      await fetch('/api/reports', {  
        method: 'POST',  
        body: JSON.stringify({  
          ...data,  
          report\_date: null // DRAFT status  
        })  
      });  
    }  
  };

  const handleFinalSubmit \= async (data) \=\> {  
    // Set report\_date to lock it  
    await fetch(\`/api/reports/${reportId}\`, {  
      method: 'PUT',  
      body: JSON.stringify({  
        ...data,  
        report\_date: new Date().toISOString().split('T')\[0\]  
      })  
    });  
  };

  return (  
    \<form\>  
      \<textarea disabled={\!canEdit} /\>  
      {canEdit && (  
        \<\>  
          \<Button onClick={handleSubmit}\>Save Draft\</Button\>  
          \<Button onClick={handleFinalSubmit}\>Submit Report\</Button\>  
        \</\>  
      )}  
    \</form\>  
  );  
}

---

## **Testing Checklist**

### **Access Control Tests**

**Employee Role:**   
\- ✓ Can view own profile \- ✓ Cannot view other employees’ profiles \- ✓ Can create/edit own DRAFT reports \- ✓ Cannot edit SUBMITTED reports \- ✓ Can request skills \- ✓ Cannot approve skills \- ✓ Cannot access audit logs \- ✓ Cannot create projects/allocations/demands

**Project Manager Role:** \- ✓ Can view team members \- ✓ Can edit managed projects (allowed fields only) \- ✓ Cannot edit project\_code, client\_id \- ✓ Can create demands for managed projects \- ✓ Can create tasks for team members only \- ✓ Cannot create tasks for non-team members \- ✓ Can approve team skills \- ✓ Cannot approve non-team skills

**HR Executive Role:** \- ✓ Can create/edit any employee \- ✓ Can create projects and assign PMs \- ✓ Can edit all project fields \- ✓ Can create allocations \- ✓ Can approve all demands \- ✓ Can approve all skills \- ✓ Can edit submitted reports (audit logged) \- ✓ Can view audit logs

### **Status Inference Tests**

**Reports:** \- ✓ New report has report\_date \= NULL (DRAFT) \- ✓ After submission, report\_date is set (SUBMITTED) \- ✓ Owner cannot edit after submission \- ✓ HR can edit submitted reports

**Skills:** \- ✓ New skill request has approved\_by \= NULL (PENDING) \- ✓ After approval, approved\_by and approved\_at are set (APPROVED) \- ✓ Rejected skills are deleted (no record) \- ✓ Employee can re-request rejected skills

---

## **Color Code Reference**

| Symbol | Meaning | Description |
| :---- | :---- | :---- |
| 🟢 | Full Access | Complete CRUD operations |
| 🟡 | Partial Access | Scoped to own/team/managed entities |
| 🔵 | Read Only | View-only access |
| 🟠 | Conditional | Based on status/time/workflow |
| 🔴 | No Access | Completely restricted |
| 🟣 | Public | No authentication required |
| ✓ | Yes / Allowed | Permission granted |
| ✗ | No / Denied | Permission denied |

