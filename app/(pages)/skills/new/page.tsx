import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NewSkillPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Skills Management</h1>
        <Link href="/skills">
          <Button variant="outline">Back to Skills</Button>
        </Link>
      </div>

      <Alert>
        <AlertDescription>
          <p className="text-sm">
            This page manages skills in two ways: HR can add new skills to the
            master skills pool that everyone can use, and any user can add
            skills to their own profile by selecting from available skills and
            indicating their proficiency level. Skills added to profiles require
            HR approval before appearing publicly.
          </p>
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Navigation</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/skills">
            <Button variant="outline">View All Skills</Button>
          </Link>
          <Link href="/approvals">
            <Button variant="outline">Skill Approvals</Button>
          </Link>
          <Link href="/employees">
            <Button variant="outline">View Employees</Button>
          </Link>
          <Link href="/demands">
            <Button variant="outline">Resource Demands</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
