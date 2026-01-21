# HR Platform Database Schema 

---

## ENUM Types

task\_status\_enum           *\-- DUE, COMPLETED*  
report\_type\_enum           *\-- DAILY, WEEKLY*  
demand\_status\_enum         *\-- REQUESTED, FULFILLED, CANCELLED*  
project\_status\_enum        \-- DRAFT, ACTIVE, ON\_HOLD, COMPLETED, CANCELLED  
employee\_status\_enum       *\-- ACTIVE, EXITED*  
entity\_type\_enum           *\-- EMPLOYEE, PROJECT,* **TASK***, REPORT, DEMAND*  
attribute\_data\_type\_enum   *\-- STRING, INT, DECIMAL, BOOLEAN, DATE*

---

## Employees

Employees  
*\---------*  
**id** UUID **PRIMARY** **KEY**  
employee\_code VARCHAR **UNIQUE**         *\-- sumHR employee ID*  
ldap\_username VARCHAR **UNIQUE**         *\-- LDAP login username*  
full\_name VARCHAR  
email VARCHAR  
employee\_type VARCHAR               *\-- Full-Time / Intern*  
employee\_role VARCHAR               *\-- HR, PM, EMP*  
employee\_design VARCHAR             *\-- Designation*  
working\_location VARCHAR            *\-- City / Remote*  
department\_id UUID **REFERENCES** Departments(**id**)  
project\_manager\_id UUID **REFERENCES** Employees(**id**)  
experience\_years INT  
resume\_url TEXT  
college VARCHAR  
**degree** VARCHAR  
status employee\_status\_enum  
joined\_on DATE  
exited\_on DATE

Constraint:

CHECK (exited\_on IS NULL OR exited\_on \>= joined\_on)

Index:

UNIQUE(employee\_code)  
UNIQUE(ldap\_username)

---

## Departments

Departments  
*\-----------*  
**id** UUID **PRIMARY** **KEY**  
name VARCHAR  
designations VARCHAR

---

## Skills

Skills  
*\------*  
skill\_id UUID **PRIMARY** **KEY**  
skill\_name VARCHAR  
department\_id UUID **REFERENCES** Departments(**id**)  
created\_at DATE

Index:

UNIQUE(skill\_name)

---

## Employee\_Skills

Employee\_Skills  
*\---------------*  
skill\_id UUID **REFERENCES** Skills(skill\_id)  
emp\_id UUID **REFERENCES** Employees(**id**)  
proficiency\_level TEXT  
approved\_by UUID **REFERENCES** Employees(**id**)  
approved\_at DATE  
**PRIMARY** **KEY** (skill\_id, emp\_id)

---

## Clients

Clients  
*\-------*  
**id** UUID **PRIMARY** **KEY**  
client\_name VARCHAR  
created\_at DATE

Index:

UNIQUE(client\_name)

---

## Projects

Projects  
*\--------*  
**id** UUID **PRIMARY** **KEY**  
project\_code VARCHAR **UNIQUE**  
project\_name VARCHAR  
client\_id UUID **REFERENCES** Clients(**id**)  
short\_description TEXT  
long\_description TEXT  
pitch\_deck\_url TEXT  
github\_url TEXT  
project\_manager\_id UUID **REFERENCES** Employees(**id**)  
status project\_status\_enum **NOT NULL**  
started\_on DATE  
closed\_on DATE

---

## Project\_Allocation

Project\_Allocation  
*\------------------*  
**id** UUID **PRIMARY** **KEY**  
project\_id UUID **REFERENCES** Projects(**id**)  
emp\_id UUID **REFERENCES** Employees(**id**)  
**role** VARCHAR  
allocation\_percentage DECIMAL(5,2)  
start\_date DATE  
end\_date DATE  
billability BOOLEAN  
is\_critical\_resource BOOLEAN  
assigned\_by UUID **REFERENCES** Employees(**id**)

---

## Phase

Phase  
*\-----*  
**id** UUID **PRIMARY** **KEY**  
project\_id UUID **REFERENCES** Projects(**id**)  
phase\_name TEXT  
phase\_description TEXT  
created\_at DATE

---

## Phase\_Reports

Phase\_Reports  
*\-------------*  
**id** UUID **PRIMARY** **KEY**  
phase\_id UUID **REFERENCES** Phase(**id**)  
content VARCHAR  
submitted\_by UUID **REFERENCES** Employees(**id**)  
submitted\_at DATE

---

## Demands

Demands  
*\-------*  
**id** UUID **PRIMARY** **KEY**  
project\_id UUID **REFERENCES** Projects(**id**)  
role\_required VARCHAR  
start\_date DATE  
end\_date DATE  
requested\_by UUID **REFERENCES** Employees(**id**)  
status demand\_status\_enum

---

## Demand\_Skills

Demand\_Skills  
*\-------------*  
demand\_id UUID **REFERENCES** Demands(**id**)  
skill\_id UUID **REFERENCES** Skills(skill\_id)  
**PRIMARY** **KEY** (demand\_id, skill\_id)

---

## Reports (Weekly)

Reports  
*\-------*  
**id** UUID **PRIMARY** **KEY**  
emp\_id UUID **REFERENCES** Employees(**id**)  
report\_type report\_type\_enum  
report\_date DATE  
week\_start\_date DATE  
week\_end\_date DATE  
content TEXT  
weekly\_hours JSON      *\-- {"PR01":20, "PR02":20}*  
created\_at DATE

---

## Tasks

Tasks  
*\-----*  
**id** UUID **PRIMARY** **KEY**  
owner\_id UUID **REFERENCES** Employees(**id**)  
entity\_id UUID  
entity\_type entity\_type\_enum  
description TEXT  
status task\_status\_enum  
due\_on DATE  
assigned\_by UUID **REFERENCES** Employees(**id**)  
created\_at DATE

---

## Audit

**Audit**  
*\-----*  
**id** UUID **PRIMARY** **KEY**  
entity\_id UUID  
entity\_type entity\_type\_enum  
row\_id UUID  
operation VARCHAR  
changed\_by UUID **REFERENCES** Employees(**id**)  
changed\_at DATE  
changed\_fields JSON

Indexes:

(entity\_type, entity\_id)  
(row\_id)  
(changed\_at)

---

## Flexible Schema

### Attributes

**Attributes**  
*\----------*  
**id** UUID **PRIMARY** **KEY**  
entity\_type entity\_type\_enum  
name VARCHAR  
data\_type attribute\_data\_type\_enum  
is\_required BOOLEAN  
created\_at DATE  
**UNIQUE**(entity\_type, name)

### Attribute\_Values

Attribute\_Values  
*\----------------*  
**id** UUID **PRIMARY** **KEY**  
entity\_id UUID  
attribute\_id UUID **REFERENCES** **Attributes**(**id**)  
value\_string VARCHAR  
value\_int INT  
value\_decimal DECIMAL  
value\_bool BOOLEAN  
value\_date DATE  
**UNIQUE**(entity\_id, attribute\_id)

---

## Final Notes

* Employees are platform users authenticated via LDAP

* One weekly report \= one row

* Weekly hours stored as JSON snapshot

* All relations enforced via foreign keys

* Audit tracks all mutations

* Flexible schema allows dynamic attributes

---

Schema is now frozen.

# HR Platform – Full PostgreSQL DDL

*\-- \=====================================================*  
*\-- ENUM TYPES*  
*\-- \=====================================================*

**CREATE** **TYPE** task\_status\_enum **AS** ENUM ('DUE', 'COMPLETED');  
**CREATE** **TYPE** report\_type\_enum **AS** ENUM ('DAILY', 'WEEKLY');  
**CREATE** **TYPE** demand\_status\_enum **AS** ENUM ('REQUESTED', 'FULFILLED', 'CANCELLED');  
**CREATE** **TYPE** employee\_status\_enum **AS** ENUM ('ACTIVE', 'EXITED');  
**CREATE** **TYPE** entity\_type\_enum **AS** ENUM ('EMPLOYEE', 'PROJECT', 'TASK', 'REPORT', 'DEMAND');  
**CREATE** **TYPE** attribute\_data\_type\_enum **AS** ENUM ('STRING', 'INT', 'DECIMAL', 'BOOLEAN', 'DATE');  
**CREATE TYPE** project\_status\_enum **AS** ENUM ('DRAFT', 'ACTIVE', 'ON\_HOLD', 'COMPLETED', 'CANCELLED');

*\-- \=====================================================*  
*\-- MASTER TABLES*  
*\-- \=====================================================*

**CREATE** **TABLE** Departments (  
  **id** UUID **PRIMARY** **KEY**,  
  name VARCHAR **NOT** **NULL**,  
  designations VARCHAR  
);

**CREATE** **TABLE** Clients (  
  **id** UUID **PRIMARY** **KEY**,  
  client\_name VARCHAR **NOT** **NULL** **UNIQUE**,  
  created\_at DATE **NOT** **NULL**  
);

**CREATE** **TABLE** Skills (  
  skill\_id UUID **PRIMARY** **KEY**,  
  skill\_name VARCHAR **NOT** **NULL** **UNIQUE**,  
  department\_id UUID **REFERENCES** Departments(**id**),  
  created\_at DATE **NOT** **NULL**  
);

*\-- \=====================================================*  
*\-- EMPLOYEES (Platform Users)*  
*\-- \=====================================================*

**CREATE** **TABLE** Employees (  
  **id** UUID **PRIMARY** **KEY**,  
  employee\_code VARCHAR **NOT** **NULL** **UNIQUE**,  
  ldap\_username VARCHAR **NOT** **NULL** **UNIQUE**,  
  full\_name VARCHAR **NOT** **NULL**,  
  email VARCHAR **NOT** **NULL**,  
  employee\_type VARCHAR,  
  employee\_role VARCHAR,  
  employee\_design VARCHAR,  
  working\_location VARCHAR,  
  department\_id UUID **REFERENCES** Departments(**id**),  
  project\_manager\_id UUID **REFERENCES** Employees(**id**),  
  experience\_years INT,  
  resume\_url TEXT,  
  college VARCHAR,  
  **degree** VARCHAR,  
  status employee\_status\_enum **NOT** **NULL**,  
  joined\_on DATE **NOT** **NULL**,  
  exited\_on DATE,  
  **CHECK** (exited\_on **IS** **NULL** **OR** exited\_on \>= joined\_on)  
);

*\-- \=====================================================*  
*\-- EMPLOYEE SKILLS*  
*\-- \=====================================================*

**CREATE** **TABLE** Employee\_Skills (  
  skill\_id UUID **REFERENCES** Skills(skill\_id),  
  emp\_id UUID **REFERENCES** Employees(**id**),  
  proficiency\_level TEXT,  
  approved\_by UUID **REFERENCES** Employees(**id**),  
  approved\_at DATE,  
  **PRIMARY** **KEY** (skill\_id, emp\_id)  
);

*\-- \=====================================================*  
*\-- PROJECTS*  
*\-- \=====================================================*

**CREATE** **TABLE** Projects (  
  **id** UUID **PRIMARY** **KEY**,  
  project\_code VARCHAR **NOT** **NULL** **UNIQUE**,  
  project\_name VARCHAR **NOT** **NULL**,  
  client\_id UUID **REFERENCES** Clients(**id**),  
  short\_description TEXT,  
  long\_description TEXT,  
  pitch\_deck\_url TEXT,  
  github\_url TEXT,  
  project\_manager\_id UUID **REFERENCES** Employees(**id**),  
  status project\_status\_enum **NOT NULL**,  
  started\_on DATE,  
  closed\_on DATE  
);

*\-- \=====================================================*  
*\-- PROJECT ALLOCATION*  
*\-- \=====================================================*

**CREATE** **TABLE** Project\_Allocation (  
  **id** UUID **PRIMARY** **KEY**,  
  project\_id UUID **REFERENCES** Projects(**id**),  
  emp\_id UUID **REFERENCES** Employees(**id**),  
  **role** VARCHAR,  
  allocation\_percentage DECIMAL(5,2),  
  start\_date DATE,  
  end\_date DATE,  
  billability BOOLEAN,  
  is\_critical\_resource BOOLEAN,  
  assigned\_by UUID **REFERENCES** Employees(**id**)  
);

*\-- \=====================================================*  
*\-- PHASES*  
*\-- \=====================================================*

**CREATE** **TABLE** Phase (  
  **id** UUID **PRIMARY** **KEY**,  
  project\_id UUID **REFERENCES** Projects(**id**),  
  phase\_name TEXT,  
  phase\_description TEXT,  
  created\_at DATE  
);

**CREATE** **TABLE** Phase\_Reports (  
  **id** UUID **PRIMARY** **KEY**,  
  phase\_id UUID **REFERENCES** Phase(**id**),  
  content VARCHAR,  
  submitted\_by UUID **REFERENCES** Employees(**id**),  
  submitted\_at DATE  
);

*\-- \=====================================================*  
*\-- DEMANDS*  
*\-- \=====================================================*

**CREATE** **TABLE** Demands (  
  **id** UUID **PRIMARY** **KEY**,  
  project\_id UUID **REFERENCES** Projects(**id**),  
  role\_required VARCHAR,  
  start\_date DATE,  
  end\_date DATE,  
  requested\_by UUID **REFERENCES** Employees(**id**),  
  status demand\_status\_enum **NOT** **NULL**  
);

**CREATE** **TABLE** Demand\_Skills (  
  demand\_id UUID **REFERENCES** Demands(**id**),  
  skill\_id UUID **REFERENCES** Skills(skill\_id),  
  **PRIMARY** **KEY** (demand\_id, skill\_id)  
);

*\-- \=====================================================*  
*\-- REPORTS (Weekly Snapshot)*  
*\-- \=====================================================*

**CREATE** **TABLE** Reports (  
  **id** UUID **PRIMARY** **KEY**,  
  emp\_id UUID **REFERENCES** Employees(**id**),  
  report\_type report\_type\_enum **NOT** **NULL**,  
  report\_date DATE **NOT** **NULL**,  
  week\_start\_date DATE,  
  week\_end\_date DATE,  
  content TEXT,  
  weekly\_hours JSON,  
  created\_at DATE **NOT** **NULL**  
);

*\-- \=====================================================*  
*\-- TASKS*  
*\-- \=====================================================*

**CREATE** **TABLE** Tasks (  
  **id** UUID **PRIMARY** **KEY**,  
  owner\_id UUID **REFERENCES** Employees(**id**),  
  entity\_id UUID,  
  entity\_type entity\_type\_enum,  
  description TEXT,  
  status task\_status\_enum **NOT** **NULL**,  
  due\_on DATE,  
  assigned\_by UUID **REFERENCES** Employees(**id**),  
  created\_at DATE **NOT** **NULL**  
);

*\-- \=====================================================*  
*\-- AUDIT*  
*\-- \=====================================================*

**CREATE** **TABLE** Audit (  
  **id** UUID **PRIMARY** **KEY**,  
  entity\_id UUID,  
  entity\_type entity\_type\_enum,  
  row\_id UUID,  
  operation VARCHAR,  
  changed\_by UUID **REFERENCES** Employees(**id**),  
  changed\_at DATE **NOT** **NULL**,  
  changed\_fields JSON  
);

**CREATE** **INDEX** idx\_audit\_entity **ON** **Audit**(entity\_type, entity\_id);  
**CREATE** **INDEX** idx\_audit\_row **ON** **Audit**(row\_id);  
**CREATE** **INDEX** idx\_audit\_changed\_at **ON** **Audit**(changed\_at);

*\-- \=====================================================*  
*\-- FLEXIBLE SCHEMA*  
*\-- \=====================================================*

**CREATE** **TABLE** Attributes (  
  **id** UUID **PRIMARY** **KEY**,  
  entity\_type entity\_type\_enum **NOT** **NULL**,  
  name VARCHAR **NOT** **NULL**,  
  data\_type attribute\_data\_type\_enum **NOT** **NULL**,  
  is\_required BOOLEAN **DEFAULT** **FALSE**,  
  created\_at DATE **NOT** **NULL**,  
  **UNIQUE**(entity\_type, name)  
);

**CREATE** **TABLE** Attribute\_Values (  
  **id** UUID **PRIMARY** **KEY**,  
  entity\_id UUID **NOT** **NULL**,  
  attribute\_id UUID **REFERENCES** **Attributes**(**id**),  
  value\_string VARCHAR,  
  value\_int INT,  
  value\_decimal DECIMAL,  
  value\_bool BOOLEAN,  
  value\_date DATE,  
  **UNIQUE**(entity\_id, attribute\_id)  
);

# ER – Diagram ![][image1] 

[image1]: <data:image/png;base64,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>