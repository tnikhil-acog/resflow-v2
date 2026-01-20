import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Reports</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>Weekly or daily reports from reports table</li>
          <li>
            Columns: report_id, emp_id, report_type, report_date, content,
            weekly_hours (JSONB)
          </li>
          <li>Employees (role='employee') must submit weekly reports</li>
          <li>Interns (role='intern') must submit daily reports</li>
          <li>
            weekly_hours contains project_code and hours logged per project
          </li>
          <li>
            Duplicate check: one report per emp_id + report_date + report_type
          </li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            WHERE emp_id = current_user_id, POST with emp_id = current_user_id
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View WHERE emp_id IN (team members) OR emp_id = current_user_id,
            POST own reports
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all, POST own reports, PUT to edit any
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/reports/new">
          <Button>Submit New Report</Button>
        </Link>
        <Link href="/reports/RPT-001">
          <Button variant="outline">View Report Details</Button>
        </Link>
        <Link href="/logs">
          <Button variant="outline">Logs</Button>
        </Link>
        <Link href="/tasks">
          <Button variant="outline">Tasks</Button>
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
