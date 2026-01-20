import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuditPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>Complete history from audit_logs table</li>
          <li>
            Columns: entity_id, entity_type, row_id, operation
            (INSERT/UPDATE/DELETE), changed_by, changed_at, changed_fields
          </li>
          <li>
            changed_fields is JSONB containing old_value and new_value for each
            modified column
          </li>
          <li>Auto-populated by database triggers on INSERT/UPDATE/DELETE</li>
          <li>
            Tracks changes to: employees, projects, allocations, reports, tasks,
            skills, demands
          </li>
          <li>
            Filter by: entity_type, entity_id, operation, changed_by, date range
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
            View all logs with filters, no edit capability
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/employees">
          <Button variant="outline">Employees</Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline">Projects</Button>
        </Link>
        <Link href="/approvals">
          <Button variant="outline">Approvals</Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline">Settings</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
