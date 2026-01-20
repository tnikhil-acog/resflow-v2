import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ApprovalsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Approvals</h2>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>
            Pending skill claims from employee_skills table WHERE approved_by IS
            NULL
          </li>
          <li>Columns: emp_id, skill_id, proficiency_level, claimed_at</li>
          <li>
            When employee adds skill to profile, it needs hr_executive approval
          </li>
          <li>
            POST /api/approvals with action='approve' sets approved_by =
            current_user_id
          </li>
          <li>
            POST /api/approvals with action='reject' deletes the row from
            employee_skills
          </li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> No
            access to this page
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            No access to this page
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all pending, POST to approve or reject
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/skills">
          <Button variant="outline">Skills</Button>
        </Link>
        <Link href="/employees">
          <Button variant="outline">Employees</Button>
        </Link>
        <Link href="/audit">
          <Button variant="outline">Audit</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
