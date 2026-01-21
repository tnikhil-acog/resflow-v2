# API Routes Update Summary

## Changes Made (Textual Content Only)

### ✅ Updated Existing Routes

#### 1. `/app/api/auth/route.ts`

- **Changed**: Login now uses `ldap_username` instead of `email`
- **Added**: Full user fields in response including `ldap_username`, `employee_design`, `experience_years`, `resume_url`, `college`, `degree`
- **Fixed**: Error codes (401 instead of 403 for auth failures)

#### 2. `/app/api/employees/route.ts`

- **Changed**: POST endpoint to `/api/employees/create` (explicit naming)
- **Added**: `ldap_username` field throughout
- **Added**: Proper role-based data filtering (employee/PM see limited fields, HR sees all)
- **Changed**: Exit endpoint from DELETE to POST `/api/employees/exit`
- **Added**: GET `/api/employees/get` with query param `?id=uuid`
- **Added**: Comprehensive validation for exit (allocations check)
- **Fixed**: Field naming consistency (`employee_design` instead of generic `role`)

#### 3. `/app/api/projects/route.ts`

- **Changed**: POST endpoint to `/api/projects/create`
- **Changed**: Uses `client_id` (uuid) instead of `client_name` (string)
- **Added**: Status field with default 'DRAFT' (was 'Planning')
- **Added**: GET `/api/projects/get` with query param `?id=uuid`
- **Changed**: Close endpoint from DELETE to POST `/api/projects/close`
- **Added**: GET `/api/projects/status-transitions` endpoint
- **Added**: Two-phase project creation workflow support
- **Added**: PM edit restrictions (can only edit certain fields)
- **Added**: Status transition validation (PM vs HR permissions)

#### 4. `/app/api/allocations/route.ts`

- **Changed**: Uses `emp_id` consistently (was `employee_id`)
- **Changed**: Transfer endpoint from PATCH to POST `/api/allocations/transfer`
- **Added**: `assigned_by` field in creation and responses
- **Fixed**: Proper date overlap validation in allocation calculation
- **Added**: Comprehensive error messages for allocation percentage

#### 5. `/app/api/reports/route.ts`

- **Added**: Status inference logic (DRAFT vs SUBMITTED)
- **Added**: Report type enforcement (WEEKLY vs DAILY)
- **Added**: `week_start_date` and `week_end_date` fields for WEEKLY reports
- **Added**: PUT `/api/reports/update` endpoint for editing
- **Added**: Edit restrictions (owner can edit DRAFT, HR can edit SUBMITTED)
- **Added**: Proper validation for report types based on employee type

#### 6. `/app/api/logs/route.ts`

- **Complete Rewrite**: Now clearly states logs are localStorage only
- **Removed**: All database operations
- **Added**: Frontend implementation guidance
- **Clarified**: Logs aggregate into weekly_hours in Reports table

#### 7. `/app/api/demands/route.ts`

- **Changed**: Both PM and HR can create demands (was PM only)
- **Added**: GET `/api/demands/get` endpoint
- **Added**: PUT `/api/demands/update` endpoint (PM can edit while REQUESTED)
- **Added**: POST `/api/demands/approve` endpoint for HR
- **Changed**: Status from 'Pending' to 'REQUESTED'
- **Added**: Full demand workflow (REQUESTED → FULFILLED/CANCELLED)

#### 8. `/app/api/skills/route.ts`

- **Changed**: POST endpoint to `/api/skills/create`
- **Added**: POST `/api/skills/request` endpoint (employee requests skill)
- **Added**: POST `/api/skills/approve` endpoint (PM/HR approve)
- **Added**: GET `/api/skills/employee` endpoint (view employee skills)
- **Added**: Role-based approval (PM for team, HR for all)
- **Added**: Status inference (PENDING vs APPROVED)
- **Added**: Rejection workflow (DELETE row on rejection)

#### 9. `/app/api/tasks/route.ts`

- **Changed**: POST endpoint to `/api/tasks/create`
- **Changed**: Both PM and HR can create tasks (was HR only)
- **Added**: GET `/api/tasks/get` endpoint
- **Added**: PATCH `/api/tasks/complete` endpoint
- **Added**: `assigned_by` field tracking
- **Added**: PM team member validation
- **Fixed**: Task visibility filtering by role

#### 10. `/app/api/approvals/route.ts`

- **Changed**: Both PM and HR can view (was HR only)
- **Added**: GET `/api/approvals/list` endpoint
- **Added**: PM sees pending skills for team members only
- **Added**: HR sees all pending items (skills + demands)
- **Added**: POST `/api/approvals/approve-skill` endpoint
- **Added**: POST `/api/approvals/approve-demand` endpoint
- **Added**: Type filtering (skills, demands, all)

#### 11. `/app/api/audit/route.ts`

- **Changed**: GET endpoint to `/api/audit/list`
- **Changed**: POST endpoint to `/api/audit/log` (marked as internal)
- **Added**: Entity type enum documentation
- **Added**: Note about internal-only usage for POST

---

### ✅ Created New Routes

#### 12. `/app/api/departments/route.ts` ⭐ NEW

- **GET /api/departments/list**: List all departments
- **POST /api/departments/create**: Create department (HR only)

#### 13. `/app/api/clients/route.ts` ⭐ NEW

- **GET /api/clients/list**: List all clients
- **POST /api/clients/create**: Create client (HR only)
- **GET /api/clients/get**: Get single client with projects

#### 14. `/app/api/phases/route.ts` ⭐ NEW

- **POST /api/phases/create**: Create phase (PM/HR)
- **GET /api/phases/list**: List phases for project
- **PUT /api/phases/update**: Update phase (PM/HR)
- **POST /api/phase-reports/create**: Create phase report (PM/HR)
- **PUT /api/phase-reports/update**: Update phase report (HR only)

---

## Summary Statistics

### Total Endpoints: 47

#### By Module:

- **Authentication**: 3 endpoints
- **Employees**: 5 endpoints (create, list, get, update, exit)
- **Departments**: 2 endpoints ⭐ NEW
- **Clients**: 3 endpoints ⭐ NEW
- **Projects**: 6 endpoints (create, list, get, update, close, status-transitions)
- **Phases**: 5 endpoints ⭐ NEW
- **Allocations**: 4 endpoints (create, list, update, transfer)
- **Reports**: 4 endpoints (create, list, get, update)
- **Logs**: 0 endpoints (localStorage only)
- **Demands**: 5 endpoints (create, list, get, update, approve)
- **Skills**: 6 endpoints (create, list, delete, request, approve, employee)
- **Tasks**: 4 endpoints (create, list, get, complete)
- **Approvals**: 3 endpoints (list, approve-skill, approve-demand)
- **Audit**: 2 endpoints (list, log-internal)

---

## Key Improvements

### 1. **Consistency**

- Uniform endpoint naming (`/create`, `/list`, `/get`, `/update`)
- Consistent field naming (`emp_id` vs `employee_id`)
- Consistent status values (`ACTIVE` not `Active`)

### 2. **RBAC Implementation**

- Proper role-based data filtering
- PM can only access team members
- Employee sees limited data
- HR has full access

### 3. **Business Logic**

- Two-phase project creation workflow
- Status inference (Reports, Skills)
- Demand approval workflow
- Skills request-approval workflow
- localStorage for daily logs

### 4. **Validation**

- Allocation percentage validation
- Date range validation
- Status transition validation
- Team member validation for PM

### 5. **Audit Trail**

- All mutations tracked
- Changed by user tracked
- Field-level changes in JSON

---

## Next Steps

1. **Implement actual code** for all route handlers
2. **Create middleware** for JWT validation and role checking
3. **Create utility functions** for status inference
4. **Create database queries** following the textual specifications
5. **Write tests** for each endpoint
6. **Create frontend integration** matching these contracts

---

## Files Modified

1. ✏️ `/app/api/auth/route.ts`
2. ✏️ `/app/api/employees/route.ts`
3. ✏️ `/app/api/projects/route.ts`
4. ✏️ `/app/api/allocations/route.ts`
5. ✏️ `/app/api/reports/route.ts`
6. ✏️ `/app/api/logs/route.ts`
7. ✏️ `/app/api/demands/route.ts`
8. ✏️ `/app/api/skills/route.ts`
9. ✏️ `/app/api/tasks/route.ts`
10. ✏️ `/app/api/approvals/route.ts`
11. ✏️ `/app/api/audit/route.ts`

## Files Created

12. ⭐ `/app/api/departments/route.ts`
13. ⭐ `/app/api/clients/route.ts`
14. ⭐ `/app/api/phases/route.ts`

---

**Status**: ✅ All textual specifications updated and aligned with documentation
**Ready for**: Code implementation
