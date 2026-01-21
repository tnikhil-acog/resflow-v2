import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const employeeRoleEnum = pgEnum("employee_role", [
  "employee",
  "project_manager",
  "hr_executive",
]);
export const employeeTypeEnum = pgEnum("employee_type", [
  "Full-Time",
  "Intern",
]);
export const statusEnum = pgEnum("status", ["ACTIVE", "EXITED"]);
export const projectStatusEnum = pgEnum("project_status", [
  "DRAFT",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
]);
export const demandStatusEnum = pgEnum("demand_status", [
  "REQUESTED",
  "FULFILLED",
  "CANCELLED",
]);
export const reportTypeEnum = pgEnum("report_type", ["DAILY", "WEEKLY"]);
export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "complete",
  "cancelled",
]);

// Employees Table
export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  employee_code: varchar("employee_code", { length: 50 }).notNull().unique(),
  ldap_username: varchar("ldap_username", { length: 100 }).notNull().unique(),
  full_name: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  employee_type: employeeTypeEnum("employee_type").notNull(),
  employee_role: employeeRoleEnum("employee_role")
    .notNull()
    .default("employee"),
  employee_design: varchar("employee_design", { length: 100 }),
  working_location: varchar("working_location", { length: 100 }),
  department_id: uuid("department_id"),
  project_manager_id: uuid("project_manager_id"),
  experience_years: decimal("experience_years", { precision: 4, scale: 1 }),
  resume_url: text("resume_url"),
  college: varchar("college", { length: 255 }),
  degree: varchar("degree", { length: 255 }),
  status: statusEnum("status").notNull().default("ACTIVE"),
  joined_on: date("joined_on").notNull(),
  exited_on: date("exited_on"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Departments Table
export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  designations: text("designations"), // Comma-separated list
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Clients Table
export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  client_name: varchar("client_name", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Projects Table
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  project_code: varchar("project_code", { length: 50 }).notNull().unique(),
  project_name: varchar("project_name", { length: 255 }).notNull(),
  client_id: uuid("client_id").notNull(),
  short_description: text("short_description"),
  long_description: text("long_description"),
  pitch_deck_url: text("pitch_deck_url"),
  github_url: text("github_url"),
  project_manager_id: uuid("project_manager_id").notNull(),
  status: projectStatusEnum("status").notNull().default("DRAFT"),
  started_on: date("started_on"),
  closed_on: date("closed_on"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Project Allocation Table
export const projectAllocation = pgTable("project_allocation", {
  id: uuid("id").defaultRandom().primaryKey(),
  emp_id: uuid("emp_id").notNull(),
  project_id: uuid("project_id").notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  allocation_percentage: decimal("allocation_percentage", {
    precision: 5,
    scale: 2,
  }).notNull(),
  start_date: date("start_date").notNull(),
  end_date: date("end_date"),
  billability: boolean("billability").notNull().default(true),
  is_critical_resource: boolean("is_critical_resource")
    .notNull()
    .default(false),
  assigned_by: uuid("assigned_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Skills Table
export const skills = pgTable("skills", {
  skill_id: uuid("skill_id").defaultRandom().primaryKey(),
  skill_name: varchar("skill_name", { length: 100 }).notNull().unique(),
  skill_department: varchar("skill_department", { length: 100 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Employee Skills Table
export const employeeSkills = pgTable("employee_skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  emp_id: uuid("emp_id").notNull(),
  skill_id: uuid("skill_id").notNull(),
  proficiency_level: varchar("proficiency_level", { length: 50 }),
  approved_by: uuid("approved_by"),
  approved_at: date("approved_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Resource Demands Table
export const resourceDemands = pgTable("resource_demands", {
  id: uuid("id").defaultRandom().primaryKey(),
  project_id: uuid("project_id").notNull(),
  role_required: varchar("role_required", { length: 100 }).notNull(),
  skills_required: text("skills_required"), // Comma-separated skill IDs
  start_date: date("start_date").notNull(),
  requested_by: uuid("requested_by").notNull(),
  demand_status: demandStatusEnum("demand_status")
    .notNull()
    .default("REQUESTED"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Reports Table
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  emp_id: uuid("emp_id").notNull(),
  report_type: reportTypeEnum("report_type").notNull(),
  report_date: date("report_date"), // NULL = DRAFT, NOT NULL = SUBMITTED
  week_start_date: date("week_start_date"),
  week_end_date: date("week_end_date"),
  content: text("content").notNull(),
  weekly_hours: jsonb("weekly_hours"), // { "project_code": hours }
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Tasks Table
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  owner_id: uuid("owner_id").notNull(),
  entity_id: uuid("entity_id").notNull(),
  status: taskStatusEnum("status").notNull().default("pending"),
  due_on: date("due_on"),
  assigned_by: uuid("assigned_by").notNull(),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Phases Table
export const phases = pgTable("phase", {
  id: uuid("id").defaultRandom().primaryKey(),
  project_id: uuid("project_id").notNull(),
  phase_name: varchar("phase_name", { length: 255 }).notNull(),
  phase_description: text("phase_description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Phase Reports Table
export const phaseReports = pgTable("phase_report", {
  id: uuid("id").defaultRandom().primaryKey(),
  phase_id: uuid("phase_id").notNull(),
  content: text("content").notNull(),
  submitted_by: uuid("submitted_by").notNull(),
  submitted_at: timestamp("submitted_at").defaultNow().notNull(),
});

// Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity_type: varchar("entity_type", { length: 50 }).notNull(),
  entity_id: uuid("entity_id").notNull(),
  operation: varchar("operation", { length: 20 }).notNull(), // INSERT, UPDATE, DELETE
  changed_by: uuid("changed_by").notNull(),
  changed_at: timestamp("changed_at").defaultNow().notNull(),
  changed_fields: jsonb("changed_fields"),
});
