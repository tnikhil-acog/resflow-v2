import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

      <div className="bg-card border border-border rounded p-4">
        <p className="text-sm font-medium mb-2">What this shows:</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-3">
          <li>Count of active projects (status != 'Closed')</li>
          <li>Count of pending tasks (status = 'due')</li>
          <li>Total logged hours this week</li>
          <li>Tasks with due_on in next 7 days</li>
          <li>Missing weekly reports for current week</li>
        </ul>
        <p className="text-xs text-muted-foreground mb-4">
          All data filtered by user role from JWT token
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">Quick Actions:</p>
            <div className="flex gap-2 flex-wrap">
              <Link href="/logs/new">
                <Button size="sm">Log Work</Button>
              </Link>
              <Link href="/reports/new">
                <Button size="sm">Submit Report</Button>
              </Link>
              <Link href="/allocations/new">
                <Button size="sm" variant="secondary">
                  Create Allocation
                </Button>
              </Link>
              <Link href="/employees/new">
                <Button size="sm" variant="secondary">
                  Add Employee
                </Button>
              </Link>
              <Link href="/projects/new">
                <Button size="sm" variant="secondary">
                  New Project
                </Button>
              </Link>
              <Link href="/demands/new">
                <Button size="sm" variant="secondary">
                  Request Resource
                </Button>
              </Link>
              <Link href="/skills/new">
                <Button size="sm" variant="secondary">
                  Manage Skills
                </Button>
              </Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">View All Pages:</p>
            <div className="flex gap-2 flex-wrap">
              <Link href="/employees">
                <Button size="sm" variant="outline">
                  Employees
                </Button>
              </Link>
              <Link href="/projects">
                <Button size="sm" variant="outline">
                  Projects
                </Button>
              </Link>
              <Link href="/allocations">
                <Button size="sm" variant="outline">
                  Allocations
                </Button>
              </Link>
              <Link href="/logs">
                <Button size="sm" variant="outline">
                  Logs
                </Button>
              </Link>
              <Link href="/reports">
                <Button size="sm" variant="outline">
                  Reports
                </Button>
              </Link>
              <Link href="/demands">
                <Button size="sm" variant="outline">
                  Demands
                </Button>
              </Link>
              <Link href="/approvals">
                <Button size="sm" variant="outline">
                  Approvals
                </Button>
              </Link>
              <Link href="/skills">
                <Button size="sm" variant="outline">
                  Skills
                </Button>
              </Link>
              <Link href="/audit">
                <Button size="sm" variant="outline">
                  Audit
                </Button>
              </Link>
              <Link href="/tasks">
                <Button size="sm" variant="outline">
                  Tasks
                </Button>
              </Link>
              <Link href="/settings">
                <Button size="sm" variant="outline">
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
