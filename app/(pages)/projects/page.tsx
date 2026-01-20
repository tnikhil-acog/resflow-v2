import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Projects</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>List from projects table</li>
          <li>
            Columns: project_code, project_name, client_name,
            project_manager_id, priority, status, started_on
          </li>
          <li>Filter by: status (active/closed), project_manager_id</li>
          <li>GET /api/projects returns filtered rows</li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            WHERE id IN (SELECT project_id FROM project_allocations WHERE
            employee_id = current_user_id)
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View WHERE project_manager_id = current_user_id, PUT to edit own
            projects
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all, POST to create, PUT to update any, DELETE to mark closed
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/projects/new">
          <Button>Create New Project</Button>
        </Link>
        <Link href="/projects/PR-001">
          <Button variant="outline">View Project Details</Button>
        </Link>
        <Link href="/allocations">
          <Button variant="outline">Allocations</Button>
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
