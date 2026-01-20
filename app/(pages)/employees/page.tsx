import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EmployeesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Employees</h2>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>List from employees table</li>
          <li>
            Columns: employee_code, full_name, email, employee_role, role,
            status
          </li>
          <li>
            Filter by: status (active/exited), department_id, role
            (employee/intern)
          </li>
          <li>GET /api/employees returns filtered rows</li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            employee_code, full_name, role of all
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View employee_code, full_name, role of all
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View all columns, POST to create, PUT to update, DELETE to mark
            exited
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/employees/new">
          <Button>Create New Employee</Button>
        </Link>
        <Link href="/employees/EMP001">
          <Button variant="outline">View Employee Profile</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline">Projects</Button>
        </Link>
        <Link href="/allocations">
          <Button variant="outline">Allocations</Button>
        </Link>
        <Link href="/skills">
          <Button variant="outline">Skills</Button>
        </Link>
      </div>
    </div>
  );
}
