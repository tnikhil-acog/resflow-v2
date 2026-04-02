import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { checkUniqueness } from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, sql } from "drizzle-orm";

// GET /api/clients
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "get") {
    return handleGetClient(req);
  }

  return handleListClients(req);
}

// POST /api/clients
export async function POST(req: NextRequest) {
  return handleCreateClient(req);
}

/**
 * GET /api/clients/list
 * List all clients
 */
async function handleListClients(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // All authenticated users can view clients
    if (!checkRole(user, ["employee", "project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    // Fetch all clients with project count
    const clients = await db
      .select({
        id: schema.clients.id,
        client_name: schema.clients.client_name,
        created_at: schema.clients.created_at,
        project_count: sql<number>`COUNT(DISTINCT ${schema.projects.id})::int`,
      })
      .from(schema.clients)
      .leftJoin(
        schema.projects,
        eq(schema.clients.id, schema.projects.client_id),
      )
      .groupBy(
        schema.clients.id,
        schema.clients.client_name,
        schema.clients.created_at,
      )
      .orderBy(schema.clients.client_name);

    return successResponse({ clients });
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Error fetching clients:", error);
    return ErrorResponses.internalError();
  }
}

/**
 * GET /api/clients?action=get&id=xxx
 * Get single client with associated projects
 */
async function handleGetClient(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // All authenticated users can view client details
    if (!checkRole(user, ["employee", "project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return ErrorResponses.badRequest("Missing required parameter: id");
    }

    // Fetch client
    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, id));

    if (!client) {
      return ErrorResponses.notFound("Client");
    }

    // Fetch associated projects
    const projects = await db
      .select({
        id: schema.projects.id,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
      })
      .from(schema.projects)
      .where(eq(schema.projects.client_id, id))
      .orderBy(schema.projects.project_name);

    return successResponse({
      id: client.id,
      client_name: client.client_name,
      created_at: client.created_at,
      projects,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Error fetching client:", error);
    return ErrorResponses.internalError();
  }
}

/**
 * POST /api/clients/create
 * Create new client
 */
async function handleCreateClient(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only HR executives can create clients
    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { client_name } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["client_name"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Check client_name uniqueness
    const isUnique = await checkUniqueness(
      schema.clients,
      "client_name",
      client_name,
    );

    if (!isUnique) {
      return ErrorResponses.conflict("client_name already exists");
    }

    // Insert new client
    const [newClient] = await db
      .insert(schema.clients)
      .values({
        client_name,
      })
      .returning();

    return successResponse(
      {
        id: newClient.id,
        client_name: newClient.client_name,
        created_at: newClient.created_at,
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Error creating client:", error);
    return ErrorResponses.internalError();
  }
}
