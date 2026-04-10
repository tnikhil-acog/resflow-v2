import { db, schema } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";

/**
 * Resolve the set of employee IDs and project IDs that are "under" a given PM.
 *
 * Two kinds of PMs exist in the system:
 *
 *  1. PROJECT-OWNING PMs — have projects.project_manager_id = pm_id
 *     → their scope includes every employee allocated to those projects.
 *
 *  2. REPORTING-ONLY PMs — own no projects but employees set
 *     employees.reporting_manager_id = pm_id
 *     → their scope is those direct reportees.
 *
 * IMPORTANT: A PM can be BOTH — they may own projects AND have reportees
 * who are not allocated to those projects. The scope is always the UNION
 * of allocated team members + direct reportees (deduped).
 *
 * mode is derived as:
 *   "projects"  → has owned projects (even if they also have reportees)
 *   "reporting" → no projects, but has reportees
 *   "none"      → neither
 *
 * The `projectIds` field is always populated from owned projects (used for
 * allocation filtering when mode = "projects").
 */
export async function resolvePMScope(pmId: string): Promise<{
  empIds: string[];
  projectIds: string[];
  mode: "projects" | "reporting" | "none";
}> {
  // 1. Fetch owned projects
  const ownedProjects = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.project_manager_id, pmId));

  const projectIds = ownedProjects.map((p) => p.id);
  const empIdSet = new Set<string>();

  // 2. Add employees allocated to owned projects
  if (projectIds.length > 0) {
    const teamMembers = await db
      .selectDistinct({ emp_id: schema.projectAllocation.emp_id })
      .from(schema.projectAllocation)
      .where(inArray(schema.projectAllocation.project_id, projectIds));
    teamMembers.forEach((m) => empIdSet.add(m.emp_id));
  }

  // 3. ALWAYS also add direct reportees (union — avoids missing reportees
  //    who aren't allocated to this PM's projects)
  const reportees = await db
    .select({ id: schema.employees.id })
    .from(schema.employees)
    .where(eq(schema.employees.reporting_manager_id, pmId));
  reportees.forEach((r) => empIdSet.add(r.id));

  const empIds = [...empIdSet];

  if (projectIds.length > 0) {
    return { empIds, projectIds, mode: "projects" };
  }
  if (empIds.length > 0) {
    return { empIds, projectIds: [], mode: "reporting" };
  }
  return { empIds: [], projectIds: [], mode: "none" };
}
