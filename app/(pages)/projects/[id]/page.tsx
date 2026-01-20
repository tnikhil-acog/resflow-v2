import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Project Details</h2>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>Single project record from projects table WHERE id = :id</li>
          <li>
            All fields: project_code, project_name, client_name,
            short_description, long_description, pitch_deck_url, github_url,
            project_manager_id, priority, status, started_on, closed_on
          </li>
          <li>Priority values: High, Medium, Low</li>
          <li>Status values: Active, On Hold, Closed</li>
          <li>Shows team allocations for this project</li>
          <li>Shows work logs logged on this project</li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            only WHERE id IN (SELECT project_id FROM project_allocations WHERE
            employee_id = current_user_id)
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View WHERE project_manager_id = current_user_id, PUT to edit own
            project
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View any, PUT to update any field, DELETE to mark status='Closed'
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href={`/projects/${params.id}/edit`}>
          <Button>Edit Project</Button>
        </Link>
        <Link href={`/projects/${params.id}/phases`}>
          <Button variant="outline">Phases</Button>
        </Link>
        <Link href="/allocations">
          <Button variant="outline">Allocations</Button>
        </Link>
        <Link href="/logs">
          <Button variant="outline">Logs</Button>
        </Link>
        <Link href="/demands">
          <Button variant="outline">Demands</Button>
        </Link>
        <Link href="/employees">
          <Button variant="outline">Employees</Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline">All Projects</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
