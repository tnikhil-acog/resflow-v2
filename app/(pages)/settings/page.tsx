import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>Own profile from employees table WHERE id = current_user_id</li>
          <li>Editable fields: resume (URL), college (name), degree (name)</li>
          <li>
            Read-only fields: employee_code, email, employee_role, role, status,
            joined_on
          </li>
          <li>PUT /api/employees with id = current_user_id to update</li>
          <li>Cannot change role or status through this page</li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            own profile, PUT to update resume/college/degree
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View own profile, PUT to update resume/college/degree
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View own profile, PUT to update resume/college/degree
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/tasks">
          <Button variant="outline">Tasks</Button>
        </Link>
        <Link href="/skills">
          <Button variant="outline">Skills</Button>
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
