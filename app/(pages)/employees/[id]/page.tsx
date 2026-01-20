import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight">Employee Profile</h1>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>Single employee record from employees table WHERE id = :id</li>
          <li>
            All fields: employee_code, full_name, email, employee_type,
            employee_role, role, working_location, department_id,
            project_manager_id, resume, college, degree, status, joined_on,
            exited_on
          </li>
          <li>Shows current allocations for this employee</li>
          <li>Shows work logs and reports submitted by this employee</li>
          <li>
            Shows skills claimed by this employee from employee_skills table
          </li>
        </ul>
        <p className="text-sm font-medium mb-1">Who can do what:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">employee:</span> View
            only WHERE id = current_user_id
          </li>
          <li>
            <span className="font-medium text-foreground">
              project_manager:
            </span>{" "}
            View WHERE id = current_user_id OR id IN (SELECT employee_id FROM
            project_allocations WHERE project_id IN managed projects)
          </li>
          <li>
            <span className="font-medium text-foreground">hr_executive:</span>{" "}
            View any employee, PUT to update any field except id
          </li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/employees/[id]/edit">
          <Button>Edit Employee</Button>
        </Link>
        <Link href="/allocations">
          <Button variant="outline">Allocations</Button>
        </Link>
        <Link href="/logs">
          <Button variant="outline">Logs</Button>
        </Link>
        <Link href="/reports">
          <Button variant="outline">Reports</Button>
        </Link>
        <Link href="/skills">
          <Button variant="outline">Skills</Button>
        </Link>
        <Link href="/tasks">
          <Button variant="outline">Tasks</Button>
        </Link>
        <Link href="/employees">
          <Button variant="outline">All Employees</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
