"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, Column } from "@/components/data-table";
import { RequestSkillModal } from "@/components/forms/request-skill-modal";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";

interface Skill {
  id: string;
  skill_name: string;
  department_name: string;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
}

export default function SkillsPage() {
  return (
    <ProtectedRoute>
      <SkillsContent />
    </ProtectedRoute>
  );
}

function SkillsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      // Fetch skills
      const skillsResponse = await fetch("/api/skills", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!skillsResponse.ok) {
        throw new Error("Failed to fetch skills");
      }

      const skillsData = await skillsResponse.json();
      setSkills(skillsData.skills || []);

      // Fetch departments for filter
      const deptsResponse = await fetch("/api/departments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (deptsResponse.ok) {
        const deptsData = await deptsResponse.json();
        setDepartments(deptsData.departments || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestSkill = (skill: Skill) => {
    setSelectedSkill(skill);
    setRequestModalOpen(true);
  };

  const handleRequestSuccess = () => {
    toast.info("You can view your pending requests in the approvals section");
    fetchData();
  };

  // Filter skills by department
  const filteredSkills =
    selectedDepartment === "all"
      ? skills
      : skills.filter((skill) => skill.department_name === selectedDepartment);

  const columns: Column<Skill>[] = [
    {
      key: "skill_name",
      header: "Skill Name",
    },
    {
      key: "department_name",
      header: "Department",
    },
    {
      key: "created_at",
      header: "Created At",
      render: (skill) => new Date(skill.created_at).toLocaleDateString(),
    },
  ];

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Skills Catalog</h1>
              <p className="text-muted-foreground mt-1">
                Browse and request skills for your profile
              </p>
            </div>
            {user?.employee_role === "hr_executive" && (
              <Button onClick={() => router.push("/skills/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Skill
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Skills</CardTitle>
                <CardDescription>
                  Click on any skill to request it for your profile
                </CardDescription>
              </div>
              {/* Department Filter */}
              <div className="w-[200px]">
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredSkills}
              columns={columns}
              searchPlaceholder="Search skills..."
              searchKeys={["skill_name"]}
              onRowClick={handleRequestSkill}
              emptyMessage="No skills found"
              pageSize={15}
            />
          </CardContent>
        </Card>
      </div>

      <RequestSkillModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        skill={selectedSkill}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}
