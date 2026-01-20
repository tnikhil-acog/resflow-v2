import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LogsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Work Logs</h2>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>
            Daily work entries stored in reports table with report_type =
            'daily'
          </li>
          <li>Columns: emp_id, project_code, date, hours, description</li>
          <li>POST /api/logs creates new entry</li>
          <li>PUT /api/logs updates hours or description for existing entry</li>
          <li>Must have valid allocation to log hours on a project</li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            WHERE emp_id = current_user_id, POST with emp_id = current_user_id,
            PUT own logs
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View WHERE emp_id IN (SELECT employee_id FROM project_allocations
            WHERE project_id IN managed projects), POST own logs, PUT own logs
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all, POST own logs, PUT any log
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/logs/new">
          <Button>Create New Log</Button>
        </Link>
        <Link href="/reports">
          <Button variant="outline">Reports</Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline">Projects</Button>
        </Link>
        <Link href="/allocations">
          <Button variant="outline">Allocations</Button>
        </Link>
        <Link href="/tasks">
          <Button variant="outline">Tasks</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
