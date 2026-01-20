import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DemandsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Resource Demands</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>Resource requests from resource_demands table</li>
          <li>
            Columns: project_id, role_required, skills_required (array),
            start_date, requested_by, status
          </li>
          <li>Project managers raise demands when they need more resources</li>
          <li>Status values: Pending, Approved, Rejected</li>
          <li>
            Validation: project_manager_id must match current_user_id before
            POST
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
            View WHERE requested_by = current_user_id, POST for own managed
            projects only
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all, PUT to update status (Approve/Reject)
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/demands/new">
          <Button>Create New Demand</Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline">Projects</Button>
        </Link>
        <Link href="/allocations">
          <Button variant="outline">Allocations</Button>
        </Link>
        <Link href="/employees">
          <Button variant="outline">Employees</Button>
        </Link>
        <Link href="/skills">
          <Button variant="outline">Skills</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
