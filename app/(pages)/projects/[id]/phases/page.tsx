import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProjectPhasesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Project Phases</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>
            Phase completion data from reports table WHERE report_type contains
            phase info
          </li>
          <li>Phases tracked through content field in reports</li>
          <li>GET /api/reports with project_id filter returns phase reports</li>
          <li>
            POST /api/reports with report_type='phase' and phase details in
            content
          </li>
          <li>
            Common phases: Planning, Design, Development, Testing, Deployment,
            Maintenance
          </li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            WHERE project_id IN (allocated projects)
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View WHERE project_manager_id = current_user_id, POST phase reports
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all, POST phase reports, PUT to edit any
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/reports">
          <Button variant="outline">Reports</Button>
        </Link>
        <Link href="/logs">
          <Button variant="outline">Logs</Button>
        </Link>
        <Link href="/allocations">
          <Button variant="outline">Allocations</Button>
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
