import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Task Details</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>Single task from tasks table WHERE id = :id</li>
          <li>
            Fields: id, owner_id, entity_id (reference to report_id or other
            entity), status, due_on, completed_at
          </li>
          <li>status: 'due' (pending) or 'complete' (finished)</li>
          <li>entity_id links task to related item like missing report</li>
          <li>
            PATCH /api/tasks with id marks status='complete' and sets
            completed_at=NOW()
          </li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            WHERE owner_id = current_user_id, PATCH to mark own complete
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View WHERE owner_id = current_user_id, PATCH to mark own complete
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all, POST to create for any owner_id, PATCH to mark any
            complete
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/logs">
          <Button variant="outline">Logs</Button>
        </Link>
        <Link href="/reports">
          <Button variant="outline">Reports</Button>
        </Link>
        <Link href="/employees">
          <Button variant="outline">Employees</Button>
        </Link>
        <Link href="/tasks">
          <Button variant="outline">All Tasks</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
