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
  index,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/* ================= ENUMS ================= */

export const employeeRoleEnum = pgEnum("employee_role", ["EMP", "PM", "HR"]);
export const employeeTypeEnum = pgEnum("employee_type", [
  "FTE",
  "INTERN",
  "Trainee",
]);
export const genderEnum = pgEnum("gender", ["Male", "Female", "Other"]);
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
export const taskStatusEnum = pgEnum("task_status", ["DUE", "COMPLETED"]);

export const entityTypeEnum = pgEnum("entity_type", [
  "EMPLOYEE",
  "DEPARTMENT",
  "CLIENT",
  "PROJECT",
  "PROJECT_ALLOCATION",
  "SKILL",
  "EMPLOYEE_SKILL",
  "DEMAND",
  "DEMAND_SKILL",
  "REPORT",
  "TASK",
  "PHASE",
  "PHASE_REPORT",
  "DAILY_PROJECT_LOG",
  "ATTRIBUTE",
  "ATTRIBUTE_VALUE",
]);

export const attributeDataTypeEnum = pgEnum("attribute_data_type", [
  "STRING",
  "INT",
  "DECIMAL",
  "BOOLEAN",
  "DATE",
]);

/* ================= DEPARTMENTS ================= */

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    designations: text("designations"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index("departments_name_idx").on(t.name),
  }),
);

/* ================= EMPLOYEES ================= */

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employee_code: varchar("employee_code", { length: 50 }).notNull().unique(),
    ldap_username: varchar("ldap_username", { length: 100 }).notNull().unique(),
    full_name: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    gender: genderEnum("gender"),
    employee_type: employeeTypeEnum("employee_type").notNull(),
    employee_role: employeeRoleEnum("employee_role").notNull().default("EMP"),
    employee_design: varchar("employee_design", { length: 100 }),
    working_location: varchar("working_location", { length: 100 }).notNull(),

    department_id: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

    reporting_manager_id: uuid("reporting_manager_id").references(
      (): AnyPgColumn => employees.id,
      { onDelete: "set null", onUpdate: "cascade" },
    ),

    experience_years: varchar("experience_years", { length: 50 }),
    resume_url: text("resume_url"),
    college: varchar("college", { length: 255 }),
    educational_stream: varchar("educational_stream", { length: 255 }),
    status: statusEnum("status").notNull().default("ACTIVE"),
    joined_on: date("joined_on").notNull(),
    exited_on: date("exited_on"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    deptIdx: index("employees_department_idx").on(t.department_id),
    managerIdx: index("employees_manager_idx").on(t.reporting_manager_id),
    joinedIdx: index("employees_joined_on_idx").on(t.joined_on),
  }),
);

/* ================= CLIENTS ================= */

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  client_name: varchar("client_name", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/* ================= PROJECTS ================= */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    project_code: varchar("project_code", { length: 50 }).notNull().unique(),
    project_name: varchar("project_name", { length: 255 }).notNull(),

    client_id: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

    short_description: text("short_description"),
    long_description: text("long_description"),
    pitch_deck_url: text("pitch_deck_url"),
    github_url: text("github_url"),

    project_manager_id: uuid("project_manager_id").references(
      () => employees.id,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      },
    ),

    status: projectStatusEnum("status").notNull().default("DRAFT"),
    started_on: date("started_on"),
    closed_on: date("closed_on"),

    project_type: varchar("project_type", { length: 50 }),
    project_master: varchar("project_master", { length: 256 }),
    economic_billability: boolean("economic_billability"),
    capacity_billability: boolean("capacity_billability"),

    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    clientIdx: index("projects_client_idx").on(t.client_id),
    managerIdx: index("projects_manager_idx").on(t.project_manager_id),
    statusIdx: index("projects_status_idx").on(t.status),
  }),
);

/* ================= PROJECT ALLOCATION ================= */

export const projectAllocation = pgTable(
  "project_allocation",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    emp_id: uuid("emp_id")
      .notNull()
      .references(() => employees.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    project_id: uuid("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    role: varchar("role", { length: 100 }).notNull(),

    allocation_percentage: decimal("allocation_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),

    start_date: date("start_date").notNull(),
    end_date: date("end_date"),

    utilization: varchar("utilization", { length: 50 }),
    billability: boolean("billability").notNull(),

    assigned_by: uuid("assigned_by").references(() => employees.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    empIdx: index("pa_emp_idx").on(t.emp_id),
    projectIdx: index("pa_project_idx").on(t.project_id),
    startDateIdx: index("pa_start_date_idx").on(t.start_date),
  }),
);

/* ================= SKILLS ================= */

export const skills = pgTable(
  "skills",
  {
    skill_id: uuid("skill_id").defaultRandom().primaryKey(),
    skill_name: varchar("skill_name", { length: 100 }).notNull(),
    department_id: uuid("department_id").references(() => departments.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    deptIdx: index("skills_department_idx").on(t.department_id),
    nameIdx: index("skills_name_idx").on(t.skill_name),
  }),
);

/* ================= EMPLOYEE SKILLS ================= */

export const employeeSkills = pgTable(
  "employee_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    emp_id: uuid("emp_id")
      .notNull()
      .references(() => employees.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    skill_id: uuid("skill_id")
      .notNull()
      .references(() => skills.skill_id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    proficiency_level: varchar("proficiency_level", { length: 50 }),

    approved_by: uuid("approved_by").references(() => employees.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

    approved_at: date("approved_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    empIdx: index("es_emp_idx").on(t.emp_id),
    skillIdx: index("es_skill_idx").on(t.skill_id),
  }),
);

/* ================= RESOURCE DEMANDS ================= */

export const resourceDemands = pgTable("resource_demands", {
  id: uuid("id").defaultRandom().primaryKey(),
  project_id: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  role_required: varchar("role_required", { length: 100 }).notNull(),
  skills_required: text("skills_required"),
  start_date: date("start_date").notNull(),
  requested_by: uuid("requested_by")
    .notNull()
    .references(() => employees.id),
  demand_status: demandStatusEnum("demand_status")
    .notNull()
    .default("REQUESTED"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/* ================= REPORTS ================= */

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  emp_id: uuid("emp_id")
    .notNull()
    .references(() => employees.id),
  report_type: reportTypeEnum("report_type").notNull(),
  report_date: date("report_date"),
  week_start_date: date("week_start_date"),
  week_end_date: date("week_end_date"),
  content: text("content").notNull(),
  weekly_hours: jsonb("weekly_hours"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

/* ================= TASKS ================= */

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  owner_id: uuid("owner_id")
    .notNull()
    .references(() => employees.id),
  entity_id: uuid("entity_id"),
  entity_type: entityTypeEnum("entity_type"),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("DUE"),
  due_on: date("due_on"),
  assigned_by: uuid("assigned_by").references(() => employees.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/* ================= PHASES ================= */

export const phases = pgTable("phase", {
  id: uuid("id").defaultRandom().primaryKey(),
  project_id: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  phase_name: varchar("phase_name", { length: 255 }).notNull(),
  phase_description: text("phase_description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/* ================= PHASE REPORTS ================= */

export const phaseReports = pgTable("phase_report", {
  id: uuid("id").defaultRandom().primaryKey(),
  phase_id: uuid("phase_id")
    .notNull()
    .references(() => phases.id),
  content: text("content").notNull(),
  submitted_by: uuid("submitted_by")
    .notNull()
    .references(() => employees.id),
  submitted_at: timestamp("submitted_at").defaultNow().notNull(),
});

/* ================= AUDIT LOGS ================= */

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity_type: entityTypeEnum("entity_type").notNull(),
  entity_id: uuid("entity_id").notNull(),
  operation: varchar("operation", { length: 20 }).notNull(),
  changed_by: uuid("changed_by")
    .notNull()
    .references(() => employees.id),
  changed_at: timestamp("changed_at").defaultNow().notNull(),
  changed_fields: jsonb("changed_fields"),
});

/* ================= DAILY PROJECT LOGS ================= */

export const dailyProjectLogs = pgTable("daily_project_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  emp_id: uuid("emp_id")
    .notNull()
    .references(() => employees.id),
  project_id: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  log_date: date("log_date").notNull(),
  hours: decimal("hours", { precision: 4, scale: 2 }).notNull(),
  notes: text("notes"),
  locked: boolean("locked").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/* ================= DEMAND SKILLS ================= */

export const demandSkills = pgTable("demand_skills", {
  demand_id: uuid("demand_id")
    .notNull()
    .references(() => resourceDemands.id),
  skill_id: uuid("skill_id")
    .notNull()
    .references(() => skills.skill_id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/* ================= ATTRIBUTES ================= */

export const attributes = pgTable("attributes", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity_type: entityTypeEnum("entity_type").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  data_type: attributeDataTypeEnum("data_type").notNull(),
  is_required: boolean("is_required").notNull().default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

/* ================= ATTRIBUTE VALUES ================= */

export const attributeValues = pgTable("attribute_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity_id: uuid("entity_id").notNull(),
  attribute_id: uuid("attribute_id")
    .notNull()
    .references(() => attributes.id),
  value_string: varchar("value_string", { length: 255 }),
  value_int: decimal("value_int", { precision: 10, scale: 0 }),
  value_decimal: decimal("value_decimal", { precision: 15, scale: 4 }),
  value_bool: boolean("value_bool"),
  value_date: date("value_date"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
