import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const lead = await prisma.lead.update({ where: { id: params.id }, data: { assignedAgentId: body.agentId } });
  await prisma.leadActivity.create({ data: { leadId: lead.id, actorUserId: auth.userId, activityType: "lead_assigned", payload: body } });
  return Response.json({ lead });
}
