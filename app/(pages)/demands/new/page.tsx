import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NewDemandPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Resource Demand</h1>
        <Link href="/demands">
          <Button variant="outline">Back to Demands</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This form lets project managers request additional resources for
            their projects. You can specify which project needs help, what role
            is needed, which skills are required, and when the person should
            start. Once submitted, the demand goes to HR for review and they'll
            find suitable employees to assign.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/demands">
            <Button variant="outline">View All Demands</Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline">View My Projects</Button>
          </Link>
          <Link href="/allocations">
            <Button variant="outline">View Allocations</Button>
          </Link>
          <Link href="/skills">
            <Button variant="outline">View Skills</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
