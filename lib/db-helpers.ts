/**
 * Database validation helpers
 */

import { db, schema } from "./db";
import { eq, and, sql, inArray } from "drizzle-orm";

/**
 * Check if a field value is unique in a table
 */
export async function checkUniqueness(
  table: any,
  field: any,
  value: string,
  excludeId?: string,
): Promise<boolean> {
  const conditions = excludeId
    ? and(eq(field, value), sql`${table.id} != ${excludeId}`)
    : eq(field, value);

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(conditions);

  return Number(result.count) === 0;
}

/**
 * Get total count for a query
 */
export async function getCount(table: any, whereClause?: any): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(whereClause);

  return Number(result.count);
}

/**
 * Check if an employee is in a project manager's team
 */
export async function isInPMTeam(
  empId: string,
  projectManagerId: string,
): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.projectAllocation)
    .innerJoin(
      schema.projects,
      eq(schema.projectAllocation.project_id, schema.projects.id),
    )
    .where(
      and(
        eq(schema.projectAllocation.emp_id, empId),
        eq(schema.projects.project_manager_id, projectManagerId),
      ),
    );

  return Number(result.count) > 0;
}

/**
 * Get all employee IDs in a project manager's team (including the PM themselves)
 */
export async function getPMTeamMemberIds(
  projectManagerId: string,
): Promise<string[]> {
  const teamMembers = await db
    .select({ emp_id: schema.projectAllocation.emp_id })
    .from(schema.projectAllocation)
    .innerJoin(
      schema.projects,
      eq(schema.projectAllocation.project_id, schema.projects.id),
    )
    .where(eq(schema.projects.project_manager_id, projectManagerId));

  const uniqueEmpIds = [...new Set(teamMembers.map((m) => m.emp_id))];

  // Include the PM themselves
  return [...uniqueEmpIds, projectManagerId];
}

/**
 * Check if a project is managed by a specific project manager
 */
export async function isProjectManager(
  projectId: string,
  projectManagerId: string,
): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.project_manager_id, projectManagerId),
      ),
    );

  return Number(result.count) > 0;
}

/**
 * Get skill names for a list of demand IDs
 * Returns a map of demand_id -> skill_names[]
 */
export async function getDemandSkillsMap(
  demandIds: string[],
): Promise<Record<string, string[]>> {
  if (demandIds.length === 0) {
    return {};
  }

  const demandSkills = await db
    .select({
      demand_id: schema.demandSkills.demand_id,
      skill_name: schema.skills.skill_name,
    })
    .from(schema.demandSkills)
    .innerJoin(
      schema.skills,
      eq(schema.demandSkills.skill_id, schema.skills.skill_id),
    )
    .where(inArray(schema.demandSkills.demand_id, demandIds));

  // Group skills by demand_id
  return demandSkills.reduce(
    (acc, ds) => {
      if (!acc[ds.demand_id]) {
        acc[ds.demand_id] = [];
      }
      acc[ds.demand_id].push(ds.skill_name);
      return acc;
    },
    {} as Record<string, string[]>,
  );
}

/**
 * Check if an employee is allocated to a specific project
 */
export async function isEmployeeOnProject(
  empId: string,
  projectId: string,
): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.projectAllocation)
    .where(
      and(
        eq(schema.projectAllocation.emp_id, empId),
        eq(schema.projectAllocation.project_id, projectId),
      ),
    );

  return Number(result.count) > 0;
}

/**
 * Get all project IDs for an employee
 */
export async function getEmployeeProjectIds(empId: string): Promise<string[]> {
  const projects = await db
    .select({ project_id: schema.projectAllocation.project_id })
    .from(schema.projectAllocation)
    .where(eq(schema.projectAllocation.emp_id, empId));

  return [...new Set(projects.map((p) => p.project_id))];
}

/**
 * Check if a phase belongs to a project managed by a specific PM
 */
export async function isPhaseInPMProject(
  phaseId: string,
  projectManagerId: string,
): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.phases)
    .innerJoin(
      schema.projects,
      eq(schema.phases.project_id, schema.projects.id),
    )
    .where(
      and(
        eq(schema.phases.id, phaseId),
        eq(schema.projects.project_manager_id, projectManagerId),
      ),
    );

  return Number(result.count) > 0;
}
