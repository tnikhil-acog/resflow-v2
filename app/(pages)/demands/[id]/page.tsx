import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DemandDetailPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Demand Details</h1>
        <Link href="/demands">
          <Button variant="outline">Back to Demands</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This page shows details of a resource request submitted by a project
            manager. You can see which project needs help, what role and skills
            are required, and when they need someone. HR can see a list of
            suitable employees who match the required skills, view their current
            workload, and either approve the demand by assigning an employee or
            reject it with a reason.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/demands">
            <Button variant="outline">All Demands</Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline">Project Details</Button>
          </Link>
          <Link href="/employees">
            <Button variant="outline">View Employees</Button>
          </Link>
          <Link href="/skills">
            <Button variant="outline">View Skills</Button>
          </Link>
          <Link href="/allocations">
            <Button variant="outline">View Allocations</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
