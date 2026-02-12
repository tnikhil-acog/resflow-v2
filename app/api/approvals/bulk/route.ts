import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";

type ApprovalAction = "approve" | "reject";
type ApprovalType = "skill" | "demand";

interface BulkApprovalItem {
  id: string;
  type: ApprovalType;
  action: ApprovalAction;
  rejection_reason?: string;
}

interface BulkApprovalRequest {
  approvals: BulkApprovalItem[];
}

interface BulkApprovalResult {
  id: string;
  type: ApprovalType;
  status: "success" | "error";
  error?: string;
}

/**
 * POST /api/approvals/bulk
 * Bulk approve or reject skill requests and demands
 * Body: { approvals: [{ id, type, action, rejection_reason? }] }
 * Access: HR Executive only
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only HR can perform bulk approvals
    if (user.employee_role !== "hr_executive") {
      return ErrorResponses.accessDenied();
    }

    const body: BulkApprovalRequest = await req.json();

    if (
      !body.approvals ||
      !Array.isArray(body.approvals) ||
      body.approvals.length === 0
    ) {
      return ErrorResponses.badRequest(
        "Invalid request: approvals array is required",
      );
    }

    const results: BulkApprovalResult[] = [];

    // Process each approval sequentially
    for (const item of body.approvals) {
      try {
        // Validate item
        if (!item.id || !item.type || !item.action) {
          results.push({
            id: item.id,
            type: item.type,
            status: "error",
            error: "Missing required fields",
          });
          continue;
        }

        if (item.action !== "approve" && item.action !== "reject") {
          results.push({
            id: item.id,
            type: item.type,
            status: "error",
            error: "Invalid action (must be 'approve' or 'reject')",
          });
          continue;
        }

        if (item.action === "reject" && !item.rejection_reason) {
          results.push({
            id: item.id,
            type: item.type,
            status: "error",
            error: "Rejection reason is required",
          });
          continue;
        }

        // Process based on type
        if (item.type === "skill") {
          await processSkillApproval(item, user.id);
        } else if (item.type === "demand") {
          await processDemandApproval(item, user.id);
        } else {
          results.push({
            id: item.id,
            type: item.type,
            status: "error",
            error: "Invalid type (must be 'skill' or 'demand')",
          });
          continue;
        }

        results.push({
          id: item.id,
          type: item.type,
          status: "success",
        });
      } catch (error: any) {
        console.error(`Error processing ${item.type} ${item.id}:`, error);
        results.push({
          id: item.id,
          type: item.type,
          status: "error",
          error: error.message || "Processing failed",
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return Response.json({
      message: `Processed ${body.approvals.length} items: ${successCount} successful, ${errorCount} failed`,
      results,
    });
  } catch (error) {
    console.error("Error in bulk approvals:", error);
    return ErrorResponses.internalError();
  }
}

/**
 * Process a single skill approval
 */
async function processSkillApproval(item: BulkApprovalItem, hrId: string) {
  const skillRequest = await db.query.employeeSkills.findFirst({
    where: eq(schema.employeeSkills.id, item.id),
  });

  if (!skillRequest) {
    throw new Error("Skill request not found");
  }

  // Check if already approved (has approved_by and approved_at)
  if (skillRequest.approved_by !== null || skillRequest.approved_at !== null) {
    throw new Error("Skill request already processed");
  }

  const today = new Date().toISOString().split("T")[0];

  // Update skill request
  await db
    .update(schema.employeeSkills)
    .set({
      approved_by: item.action === "approve" ? hrId : null,
      approved_at: item.action === "approve" ? today : null,
    })
    .where(eq(schema.employeeSkills.id, item.id));

  // Log audit trail
  await createAuditLog({
    entity_type: "EMPLOYEE_SKILL",
    entity_id: item.id,
    operation: "UPDATE",
    changed_by: hrId,
    changed_fields: {
      skill_id: skillRequest.skill_id,
      emp_id: skillRequest.emp_id,
      action: item.action,
      approved_by: item.action === "approve" ? hrId : null,
      rejection_reason: item.rejection_reason,
    },
  });
}

/**
 * Process a single demand approval
 */
async function processDemandApproval(item: BulkApprovalItem, hrId: string) {
  const demand = await db.query.resourceDemands.findFirst({
    where: eq(schema.resourceDemands.id, item.id),
  });

  if (!demand) {
    throw new Error("Demand not found");
  }

  if (demand.demand_status !== "REQUESTED") {
    throw new Error("Demand is not pending approval");
  }

  // Update demand status
  await db
    .update(schema.resourceDemands)
    .set({
      demand_status: item.action === "approve" ? "FULFILLED" : "CANCELLED",
    })
    .where(eq(schema.resourceDemands.id, item.id));

  // Log audit trail
  await createAuditLog({
    entity_type: "DEMAND",
    entity_id: item.id,
    operation: "UPDATE",
    changed_by: hrId,
    changed_fields: {
      project_id: demand.project_id,
      old_status: demand.demand_status,
      new_status: item.action === "approve" ? "FULFILLED" : "CANCELLED",
      rejection_reason: item.rejection_reason,
    },
  });
}
