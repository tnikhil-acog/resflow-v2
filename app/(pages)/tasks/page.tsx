import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TasksPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>Task list from tasks table</li>
          <li>
            Columns: id, owner_id, entity_id (reference to related entity like
            report_id), status, due_on, completed_at
          </li>
          <li>Status values: due, complete</li>
          <li>
            Tasks auto-created for: missing weekly reports, employee exit
            reminders
          </li>
          <li>hr_executive can manually create tasks via POST /api/tasks</li>
          <li>
            PATCH /api/tasks with id marks status='complete' and sets
            completed_at=NOW()
          </li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            WHERE owner_id = current_user_id, PATCH to mark own tasks complete
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View WHERE owner_id = current_user_id, PATCH to mark own tasks
            complete
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all, POST to create for any owner_id, PATCH to mark any
            complete
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/tasks/TASK-001">
          <Button variant="outline">View Task Details</Button>
        </Link>
        <Link href="/logs">
          <Button variant="outline">Logs</Button>
        </Link>
        <Link href="/reports">
          <Button variant="outline">Reports</Button>
        </Link>
        <Link href="/employees">
          <Button variant="outline">Employees</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
