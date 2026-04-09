/**
 * Shared TypeScript interfaces used across multiple pages.
 * Import from here instead of re-defining locally.
 */

/** Simple department reference as returned by /api/departments */
export interface Department {
  id: string;
  name: string;
}

/** Employee record as returned by /api/employees list */
export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  employee_role: string;
  employee_design: string;
  department_name?: string;
  status: string;
  ldap_username?: string;
  employee_type?: string;
  working_location?: string;
  joined_on?: string;
  exited_on?: string;
}

/**
 * Skill as used in employee skill lists (profile, settings, employee detail).
 * For the minimal skill reference used in demand forms, see DemandSkill.
 */
export interface EmployeeSkill {
  id?: string;
  skill_id: string;
  skill_name: string;
  department_name?: string;
  proficiency_level?: string;
  status?: string;
  approved_at?: string;
  requested_on?: string;
  approved_on?: string;
}

/**
 * Allocation record. Covers all usage contexts via optional fields.
 * - Profile/settings/employee detail: has project_id, status, no emp fields
 * - Allocations list: has emp_id, employee_code, employee_name, no status
 * - Project detail: has emp_id, employee_code, employee_name, no project_name
 */
export interface Allocation {
  id: string;
  role: string;
  allocation_percentage: number;
  utilization?: string | null;
  is_billable: boolean;
  start_date: string;
  end_date?: string;
  // Project fields
  project_id?: string;
  project_code?: string;
  project_name?: string;
  // Employee fields (present in list/project views)
  emp_id?: string;
  employee_code?: string;
  employee_name?: string;
  // Status (present in profile/employee views)
  status?: string;
}

/** Minimal project reference (id + codes only) */
export interface ProjectRef {
  id: string;
  project_code: string;
  project_name: string;
}

/** Full project record as returned by /api/projects list */
export interface Project extends ProjectRef {
  client_id?: string;
  client_name?: string;
  project_manager_id?: string;
  project_manager_name?: string;
  status?: string;
  started_on?: string;
  closed_on?: string;
}

/** Global skill catalog entry as returned by /api/skills */
export interface Skill {
  id: string;
  skill_id: string;
  skill_name: string;
  department_id?: string;
  department_name?: string;
  created_at?: string;
}

/** Task record as returned by /api/tasks */
export interface Task {
  id: string;
  description: string;
  due_on: string;
  status: string;
  entity_type: string;
  entity_id: string;
  owner_name: string;
  assigned_by: string;
  created_at: string;
}
