import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NewReportPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Submit Report</h1>
        <Link href="/reports">
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This form submits weekly or phase reports. For weekly reports, you
            can write a summary of your week's work and break down hours spent
            on each project. For phase reports, you can document completion of
            project milestones like Planning, Design, Development, Testing, or
            Deployment phases.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/reports">
            <Button variant="outline">View All Reports</Button>
          </Link>
          <Link href="/logs">
            <Button variant="outline">View Daily Logs</Button>
          </Link>
          <Link href="/tasks">
            <Button variant="outline">View Tasks</Button>
          </Link>
          <Link href="/projects">
            <Button variant="outline">View Projects</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
