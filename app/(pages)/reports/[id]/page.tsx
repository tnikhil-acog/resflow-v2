import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Report Details</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>Single report from reports table WHERE report_id = :id</li>
          <li>
            Fields: report_id, emp_id, employee_code, employee_name,
            report_type, report_date, content, weekly_hours
          </li>
          <li>report_type: 'weekly' for employees, 'daily' for interns</li>
          <li>
            weekly_hours is JSONB array: [{"{"}&#34;project_code&#34;:
            &#34;PR-001&#34;, &#34;hours&#34;: 40{"}"}]
          </li>
          <li>content field contains work description or achievements</li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            WHERE emp_id = current_user_id
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View WHERE emp_id = current_user_id OR emp_id IN (team members)
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View any, PUT to edit content or weekly_hours
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/logs">
          <Button variant="outline">Logs</Button>
        </Link>
        <Link href="/tasks">
          <Button variant="outline">Tasks</Button>
        </Link>
        <Link href="/employees">
          <Button variant="outline">Employees</Button>
        </Link>
        <Link href="/reports">
          <Button variant="outline">All Reports</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
