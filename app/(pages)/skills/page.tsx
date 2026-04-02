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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/pagination-controls";
import { EmptyState } from "@/components/empty-state";
import { RequestSkillModal } from "@/components/forms/request-skill-modal";
import { EditSkillModal } from "@/components/forms/edit-skill-modal";
import { DeleteSkillDialog } from "@/components/forms/delete-skill-dialog";
import { toast } from "sonner";
import { Plus, Search, FileText, Pencil, Trash2 } from "lucide-react";
import { LoadingPage } from "@/components/loading-spinner";
import type { Department, Skill } from "@/lib/types";

export default function SkillsPage() {
  return (
    <ProtectedRoute>
      <SkillsContent />
    </ProtectedRoute>
  );
}

function SkillsContent() {
  const router = useRouter();
  const { user, authenticatedFetch } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and pagination state
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [selectedDepartment, setSelectedDepartment] = useState<
    string | undefined
  >(undefined);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const isHR = user?.employee_role === "hr_executive";

  // Fetch departments only once
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch skills when filters, search or page changes
  useEffect(() => {
    fetchSkills();
  }, [selectedDepartment, searchQuery, currentPage]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await authenticatedFetch("/api/departments", {
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedDepartment)
        params.append("department_name", selectedDepartment);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", currentPage.toString());
      params.append("limit", pageSize.toString());

      const response = await authenticatedFetch(`/api/skills?${params.toString()}`, {
      });

      if (!response.ok) {
        throw new Error("Failed to fetch skills");
      }

      const data = await response.json();
      setSkills(data.skills || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching skills:", error);
      toast.error("Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSkill = (skill: Skill) => {
    setSelectedSkill(skill);
    setRequestModalOpen(true);
  };

  const handleEditSkill = (e: React.MouseEvent, skill: Skill) => {
    e.stopPropagation(); // Prevent row click
    setSelectedSkill(skill);
    setEditModalOpen(true);
  };

  const handleDeleteSkill = (e: React.MouseEvent, skill: Skill) => {
    e.stopPropagation(); // Prevent row click
    setSelectedSkill(skill);
    setDeleteDialogOpen(true);
  };

  const handleRequestSuccess = () => {
    toast.info("You can view your pending requests in the approvals section");
    fetchSkills();
  };

  const handleEditSuccess = () => {
    fetchSkills();
  };

  const handleDeleteSuccess = () => {
    fetchSkills();
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-6 md:px-8 py-6">
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

      <div className="container mx-auto px-6 md:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>All Skills</CardTitle>
            <CardDescription>
              Click on any skill to request it for your profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by skill name or department..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={handleSearch} size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={(v) =>
                      setSelectedDepartment(v === "all" ? undefined : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
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
            </div>

            {/* Skills Table */}
            {skills.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-10 w-10 text-muted-foreground" />}
                title="No skills found"
                description="Try adjusting your search criteria or add a new skill"
              />
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Skill Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Created At</TableHead>
                        {isHR && (
                          <TableHead className="w-24">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skills.map((skill) => (
                        <TableRow
                          key={skill.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => !isHR && handleRequestSkill(skill)}
                        >
                          <TableCell className="font-medium">
                            {skill.skill_name}
                          </TableCell>
                          <TableCell>{skill.department_name}</TableCell>
                          <TableCell>
                            {skill.created_at ? new Date(skill.created_at).toLocaleDateString() : "-"}
                          </TableCell>
                          {isHR && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => handleEditSkill(e, skill)}
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => handleDeleteSkill(e, skill)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  currentPage={currentPage}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setCurrentPage}
                  itemName="skills"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <RequestSkillModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        skill={selectedSkill}
        onSuccess={handleRequestSuccess}
      />

      {isHR && (
        <>
          <EditSkillModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            skill={selectedSkill}
            departments={departments}
            onSuccess={handleEditSuccess}
          />

          <DeleteSkillDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            skill={selectedSkill}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}
    </div>
  );
}
