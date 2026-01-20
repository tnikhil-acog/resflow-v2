import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SkillsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Skills Matrix</h2>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>
            Master list from skills table: skill_id, skill_name,
            skill_department
          </li>
          <li>
            Employee-skill mapping from employee_skills table: emp_id, skill_id,
            proficiency_level, approved_by
          </li>
          <li>Proficiency levels: Beginner, Intermediate, Advanced, Expert</li>
          <li>
            Uniqueness: one skill_name per skills table, one emp_id+skill_id per
            employee_skills
          </li>
          <li>
            When employee adds skill, approved_by = NULL until hr_executive
            approves
          </li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            all skills from pool, add to own employee_skills (needs approval),
            update own proficiency_level
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View all skills from pool, add to own employee_skills (needs
            approval), update own proficiency_level
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all, POST to add skill to pool, PUT to approve employee_skills,
            DELETE to remove from pool
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/skills/new">
          <Button>Manage Skills</Button>
        </Link>
        <Link href="/approvals">
          <Button variant="outline">Approvals</Button>
        </Link>
        <Link href="/employees">
          <Button variant="outline">Employees</Button>
        </Link>
        <Link href="/demands">
          <Button variant="outline">Demands</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
