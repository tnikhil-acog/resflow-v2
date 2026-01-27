# HR Platform Database Schema

---

## ENUM Types

task_status_enum _\-- DUE, COMPLETED_  
report_type_enum _\-- DAILY, WEEKLY_  
demand_status_enum _\-- REQUESTED, FULFILLED, CANCELLED_  
project_status_enum \-- DRAFT, ACTIVE, ON_HOLD, COMPLETED, CANCELLED  
employee_status_enum _\-- ACTIVE, EXITED_  
entity_type_enum _\-- EMPLOYEE, PROJECT,_ **TASK\***, REPORT, DEMAND*  
attribute_data_type_enum *\-- STRING, INT, DECIMAL, BOOLEAN, DATE\*

---

## Employees

Employees  
_\---------_  
**id** UUID **PRIMARY** **KEY**  
employee_code VARCHAR **UNIQUE** _\-- sumHR employee ID_  
ldap_username VARCHAR **UNIQUE** _\-- LDAP login username_  
full_name VARCHAR  
email VARCHAR  
employee_type VARCHAR _\-- Full-Time / Intern_  
employee_role VARCHAR _\-- HR, PM, EMP_  
employee_design VARCHAR _\-- Designation_  
working_location VARCHAR _\-- City / Remote_  
department_id UUID **REFERENCES** Departments(**id**)  
project_manager_id UUID **REFERENCES** Employees(**id**)  
experience_years INT  
resume_url TEXT  
college VARCHAR  
**degree** VARCHAR  
status employee_status_enum  
joined_on DATE  
exited_on DATE

Constraint:

CHECK (exited_on IS NULL OR exited_on \>= joined_on)

Index:

UNIQUE(employee_code)  
UNIQUE(ldap_username)

---

## Departments

Departments  
_\-----------_  
**id** UUID **PRIMARY** **KEY**  
name VARCHAR  
designations VARCHAR

---

## Skills

Skills  
_\------_  
skill_id UUID **PRIMARY** **KEY**  
skill_name VARCHAR  
department_id UUID **REFERENCES** Departments(**id**)  
created_at DATE

Index:

UNIQUE(skill_name)

---

## Employee_Skills

Employee_Skills  
_\---------------_  
skill_id UUID **REFERENCES** Skills(skill_id)  
emp_id UUID **REFERENCES** Employees(**id**)  
proficiency_level TEXT  
approved_by UUID **REFERENCES** Employees(**id**)  
approved_at DATE  
**PRIMARY** **KEY** (skill_id, emp_id)

---

## Clients

Clients  
_\-------_  
**id** UUID **PRIMARY** **KEY**  
client_name VARCHAR  
created_at DATE

Index:

UNIQUE(client_name)

---

## Projects

Projects  
_\--------_  
**id** UUID **PRIMARY** **KEY**  
project_code VARCHAR **UNIQUE**  
project_name VARCHAR  
client_id UUID **REFERENCES** Clients(**id**)  
short_description TEXT  
long_description TEXT  
pitch_deck_url TEXT  
github_url TEXT  
project_manager_id UUID **REFERENCES** Employees(**id**)  
status project_status_enum **NOT NULL**  
started_on DATE  
closed_on DATE

---

## Project_Allocation

Project_Allocation  
_\------------------_  
**id** UUID **PRIMARY** **KEY**  
project_id UUID **REFERENCES** Projects(**id**)  
emp_id UUID **REFERENCES** Employees(**id**)  
**role** VARCHAR  
allocation_percentage DECIMAL(5,2)  
start_date DATE  
end_date DATE  
billability BOOLEAN  
is_critical_resource BOOLEAN  
assigned_by UUID **REFERENCES** Employees(**id**)

---

## Phase

Phase  
_\-----_  
**id** UUID **PRIMARY** **KEY**  
project_id UUID **REFERENCES** Projects(**id**)  
phase_name TEXT  
phase_description TEXT  
created_at DATE

---

## Phase_Reports

Phase_Reports  
_\-------------_  
**id** UUID **PRIMARY** **KEY**  
phase_id UUID **REFERENCES** Phase(**id**)  
content VARCHAR  
submitted_by UUID **REFERENCES** Employees(**id**)  
submitted_at DATE

---

## Demands

Demands  
_\-------_  
**id** UUID **PRIMARY** **KEY**  
project_id UUID **REFERENCES** Projects(**id**)  
role_required VARCHAR  
start_date DATE  
end_date DATE  
requested_by UUID **REFERENCES** Employees(**id**)  
status demand_status_enum

---

## Demand_Skills

Demand_Skills  
_\-------------_  
demand_id UUID **REFERENCES** Demands(**id**)  
skill_id UUID **REFERENCES** Skills(skill_id)  
**PRIMARY** **KEY** (demand_id, skill_id)

---

## Reports (Weekly)

Reports  
_\-------_  
**id** UUID **PRIMARY** **KEY**  
emp_id UUID **REFERENCES** Employees(**id**)  
report_type report_type_enum  
report_date DATE  
week_start_date DATE  
week_end_date DATE  
content TEXT  
weekly_hours JSON _\-- {"PR01":20, "PR02":20}_  
created_at DATE

\-- Create Daily_Project_Logs table

CREATE TABLE IF NOT EXISTS Daily_Project_Logs (  
 id UUID PRIMARY KEY,  
 emp_id UUID REFERENCES Employees(id),  
 project_id UUID REFERENCES Projects(id),  
 log_date DATE NOT NULL,  
 hours DECIMAL(4,2) NOT NULL CHECK (hours \>= 0 AND hours \<= 24),  
 notes TEXT,  
 locked BOOLEAN DEFAULT false,  
 created_at TIMESTAMP NOT NULL DEFAULT NOW(),  
 UNIQUE(emp_id, project_id, log_date)  
 );

\-- Indexes  
 CREATE INDEX IF NOT EXISTS idx_daily_logs_emp_date ON Daily_Project_Logs(emp_id, log_date);  
 CREATE INDEX IF NOT EXISTS idx_daily_logs_project_date ON Daily_Project_Logs(project_id, log_date);

---

## Tasks

Tasks  
_\-----_  
**id** UUID **PRIMARY** **KEY**  
owner_id UUID **REFERENCES** Employees(**id**)  
entity_id UUID  
entity_type entity_type_enum  
description TEXT  
status task_status_enum  
due_on DATE  
assigned_by UUID **REFERENCES** Employees(**id**)  
created_at DATE

---

## Audit

**Audit**  
_\-----_  
**id** UUID **PRIMARY** **KEY**  
entity_id UUID  
entity_type entity_type_enum  
row_id UUID  
operation VARCHAR  
changed_by UUID **REFERENCES** Employees(**id**)  
changed_at DATE  
changed_fields JSON

Indexes:

(entity_type, entity_id)  
(row_id)  
(changed_at)

---

## Flexible Schema

### Attributes

**Attributes**  
_\----------_  
**id** UUID **PRIMARY** **KEY**  
entity_type entity_type_enum  
name VARCHAR  
data_type attribute_data_type_enum  
is_required BOOLEAN  
created_at DATE  
**UNIQUE**(entity_type, name)

### Attribute_Values

Attribute_Values  
_\----------------_  
**id** UUID **PRIMARY** **KEY**  
entity_id UUID  
attribute_id UUID **REFERENCES** **Attributes**(**id**)  
value_string VARCHAR  
value_int INT  
value_decimal DECIMAL  
value_bool BOOLEAN  
value_date DATE  
**UNIQUE**(entity_id, attribute_id)

---

## Final Notes

- Employees are platform users authenticated via LDAP

- One weekly report \= one row

- Weekly hours stored as JSON snapshot

- All relations enforced via foreign keys

- Audit tracks all mutations

- Flexible schema allows dynamic attributes

---

Schema is now frozen.

# HR Platform – Full PostgreSQL DDL

_\-- \=====================================================_  
_\-- ENUM TYPES_  
_\-- \=====================================================_

**CREATE** **TYPE** task_status_enum **AS** ENUM ('DUE', 'COMPLETED');  
**CREATE** **TYPE** report_type_enum **AS** ENUM ('DAILY', 'WEEKLY');  
**CREATE** **TYPE** demand_status_enum **AS** ENUM ('REQUESTED', 'FULFILLED', 'CANCELLED');  
**CREATE** **TYPE** employee_status_enum **AS** ENUM ('ACTIVE', 'EXITED');  
**CREATE** **TYPE** entity_type_enum **AS** ENUM ('EMPLOYEE', 'PROJECT', 'TASK', 'REPORT', 'DEMAND');  
**CREATE** **TYPE** attribute_data_type_enum **AS** ENUM ('STRING', 'INT', 'DECIMAL', 'BOOLEAN', 'DATE');  
**CREATE TYPE** project_status_enum **AS** ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

_\-- \=====================================================_  
_\-- MASTER TABLES_  
_\-- \=====================================================_

**CREATE** **TABLE** Departments (  
 **id** UUID **PRIMARY** **KEY**,  
 name VARCHAR **NOT** **NULL**,  
 designations VARCHAR  
);

**CREATE** **TABLE** Clients (  
 **id** UUID **PRIMARY** **KEY**,  
 client_name VARCHAR **NOT** **NULL** **UNIQUE**,  
 created_at DATE **NOT** **NULL**  
);

**CREATE** **TABLE** Skills (  
 skill_id UUID **PRIMARY** **KEY**,  
 skill_name VARCHAR **NOT** **NULL** **UNIQUE**,  
 department_id UUID **REFERENCES** Departments(**id**),  
 created_at DATE **NOT** **NULL**  
);

_\-- \=====================================================_  
_\-- EMPLOYEES (Platform Users)_  
_\-- \=====================================================_

**CREATE** **TABLE** Employees (  
 **id** UUID **PRIMARY** **KEY**,  
 employee_code VARCHAR **NOT** **NULL** **UNIQUE**,  
 ldap_username VARCHAR **NOT** **NULL** **UNIQUE**,  
 full_name VARCHAR **NOT** **NULL**,  
 email VARCHAR **NOT** **NULL**,  
 employee_type VARCHAR,  
 employee_role VARCHAR,  
 employee_design VARCHAR,  
 working_location VARCHAR,  
 department_id UUID **REFERENCES** Departments(**id**),  
 project_manager_id UUID **REFERENCES** Employees(**id**),  
 experience_years INT,  
 resume_url TEXT,  
 college VARCHAR,  
 **degree** VARCHAR,  
 status employee_status_enum **NOT** **NULL**,  
 joined_on DATE **NOT** **NULL**,  
 exited_on DATE,  
 **CHECK** (exited_on **IS** **NULL** **OR** exited_on \>= joined_on)  
);

_\-- \=====================================================_  
_\-- EMPLOYEE SKILLS_  
_\-- \=====================================================_

**CREATE** **TABLE** Employee_Skills (  
 skill_id UUID **REFERENCES** Skills(skill_id),  
 emp_id UUID **REFERENCES** Employees(**id**),  
 proficiency_level TEXT,  
 approved_by UUID **REFERENCES** Employees(**id**),  
 approved_at DATE,  
 **PRIMARY** **KEY** (skill_id, emp_id)  
);

_\-- \=====================================================_  
_\-- PROJECTS_  
_\-- \=====================================================_

**CREATE** **TABLE** Projects (  
 **id** UUID **PRIMARY** **KEY**,  
 project_code VARCHAR **NOT** **NULL** **UNIQUE**,  
 project_name VARCHAR **NOT** **NULL**,  
 client_id UUID **REFERENCES** Clients(**id**),  
 short_description TEXT,  
 long_description TEXT,  
 pitch_deck_url TEXT,  
 github_url TEXT,  
 project_manager_id UUID **REFERENCES** Employees(**id**),  
 status project_status_enum **NOT NULL**,  
 started_on DATE,  
 closed_on DATE  
);

_\-- \=====================================================_  
_\-- PROJECT ALLOCATION_  
_\-- \=====================================================_

**CREATE** **TABLE** Project_Allocation (  
 **id** UUID **PRIMARY** **KEY**,  
 project_id UUID **REFERENCES** Projects(**id**),  
 emp_id UUID **REFERENCES** Employees(**id**),  
 **role** VARCHAR,  
 allocation_percentage DECIMAL(5,2),  
 start_date DATE,  
 end_date DATE,  
 billability BOOLEAN,  
 is_critical_resource BOOLEAN,  
 assigned_by UUID **REFERENCES** Employees(**id**)  
);

_\-- \=====================================================_  
_\-- PHASES_  
_\-- \=====================================================_

**CREATE** **TABLE** Phase (  
 **id** UUID **PRIMARY** **KEY**,  
 project_id UUID **REFERENCES** Projects(**id**),  
 phase_name TEXT,  
 phase_description TEXT,  
 created_at DATE  
);

**CREATE** **TABLE** Phase_Reports (  
 **id** UUID **PRIMARY** **KEY**,  
 phase_id UUID **REFERENCES** Phase(**id**),  
 content VARCHAR,  
 submitted_by UUID **REFERENCES** Employees(**id**),  
 submitted_at DATE  
);

_\-- \=====================================================_  
_\-- DEMANDS_  
_\-- \=====================================================_

**CREATE** **TABLE** Demands (  
 **id** UUID **PRIMARY** **KEY**,  
 project_id UUID **REFERENCES** Projects(**id**),  
 role_required VARCHAR,  
 start_date DATE,  
 end_date DATE,  
 requested_by UUID **REFERENCES** Employees(**id**),  
 status demand_status_enum **NOT** **NULL**  
);

**CREATE** **TABLE** Demand_Skills (  
 demand_id UUID **REFERENCES** Demands(**id**),  
 skill_id UUID **REFERENCES** Skills(skill_id),  
 **PRIMARY** **KEY** (demand_id, skill_id)  
);

_\-- \=====================================================_  
_\-- REPORTS (Weekly Snapshot)_  
_\-- \=====================================================_

**CREATE** **TABLE** Reports (  
 **id** UUID **PRIMARY** **KEY**,  
 emp_id UUID **REFERENCES** Employees(**id**),  
 report_type report_type_enum **NOT** **NULL**,  
 report_date DATE **NOT** **NULL**,  
 week_start_date DATE,  
 week_end_date DATE,  
 content TEXT,  
 weekly_hours JSON,  
 created_at DATE **NOT** **NULL**  
);

_\-- \=====================================================_  
_\-- TASKS_  
_\-- \=====================================================_

**CREATE** **TABLE** Tasks (  
 **id** UUID **PRIMARY** **KEY**,  
 owner_id UUID **REFERENCES** Employees(**id**),  
 entity_id UUID,  
 entity_type entity_type_enum,  
 description TEXT,  
 status task_status_enum **NOT** **NULL**,  
 due_on DATE,  
 assigned_by UUID **REFERENCES** Employees(**id**),  
 created_at DATE **NOT** **NULL**  
);

_\-- \=====================================================_  
_\-- AUDIT_  
_\-- \=====================================================_

**CREATE** **TABLE** Audit (  
 **id** UUID **PRIMARY** **KEY**,  
 entity_id UUID,  
 entity_type entity_type_enum,  
 row_id UUID,  
 operation VARCHAR,  
 changed_by UUID **REFERENCES** Employees(**id**),  
 changed_at DATE **NOT** **NULL**,  
 changed_fields JSON  
);

**CREATE** **INDEX** idx_audit_entity **ON** **Audit**(entity_type, entity_id);  
**CREATE** **INDEX** idx_audit_row **ON** **Audit**(row_id);  
**CREATE** **INDEX** idx_audit_changed_at **ON** **Audit**(changed_at);

_\-- \=====================================================_  
_\-- FLEXIBLE SCHEMA_  
_\-- \=====================================================_

**CREATE** **TABLE** Attributes (  
 **id** UUID **PRIMARY** **KEY**,  
 entity_type entity_type_enum **NOT** **NULL**,  
 name VARCHAR **NOT** **NULL**,  
 data_type attribute_data_type_enum **NOT** **NULL**,  
 is_required BOOLEAN **DEFAULT** **FALSE**,  
 created_at DATE **NOT** **NULL**,  
 **UNIQUE**(entity_type, name)  
);

**CREATE** **TABLE** Attribute_Values (  
 **id** UUID **PRIMARY** **KEY**,  
 entity_id UUID **NOT** **NULL**,  
 attribute_id UUID **REFERENCES** **Attributes**(**id**),  
 value_string VARCHAR,  
 value_int INT,  
 value_decimal DECIMAL,  
 value_bool BOOLEAN,  
 value_date DATE,  
 **UNIQUE**(entity_id, attribute_id)  
);

# ER – Diagram ![][image1]

## **Work Week Definition**

• Week start: Monday 00:00

• Week end: Friday 23:59

• Calendar-based

• Global system rule

• Employee cannot configure

---

## **Daily Logging Rules**

• Daily logs stored in Daily_Project_Logs table

• One row per employee, project, and calendar date

• Logs allowed only for current work week

• Logs editable only until weekly report submission

• Logs locked after weekly report submission

---

## **Weekly Reporting Rules**

• One report per employee per week

• Week window is always Monday–Friday

• System assigns week_start_date and week_end_date

• Employee submits only report content

• weekly_hours aggregated from Daily_Project_Logs

• Report immutable after submission

---

## **Submission Constraints**

• Submission allowed only Monday–Friday

• Submission blocked after Friday 23:59

• Editing blocked after submission

• Backdated logs blocked

• Future logs blocked

---

## **Enforcement**

• Friday 23:59 closes reporting window

• Daily logs locked for the week

• Weekly submission blocked after closure

#
