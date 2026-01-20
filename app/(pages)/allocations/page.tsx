import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AllocationsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Allocations</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>List from project_allocations table</li>
          <li>
            Columns: employee_id, project_id, role, allocation_percentage,
            start_date, end_date, billability
          </li>
          <li>
            Shows which employee assigned to which project at what percentage
          </li>
          <li>
            Validation: sum of allocation_percentage per employee cannot exceed
            100%
          </li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            WHERE employee_id = current_user_id
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View WHERE project_id IN (SELECT id FROM projects WHERE
            project_manager_id = current_user_id)
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all, POST to create, PUT to update percentage/dates, PATCH to
            transfer employee between projects
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/allocations/new">
          <Button>Create New Allocation</Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline">Projects</Button>
        </Link>
        <Link href="/employees">
          <Button variant="outline">Employees</Button>
        </Link>
        <Link href="/logs">
          <Button variant="outline">Logs</Button>
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
