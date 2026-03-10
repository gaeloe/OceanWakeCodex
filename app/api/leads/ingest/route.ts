import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/security";
import { enqueueSequenceRun } from "@/lib/sequence";
import { requireRole } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN", "MANAGER", "AGENT"]);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const normalizedEmail = normalizeEmail(body.email);
  const lead = await prisma.lead.upsert({
    where: { normalizedEmail },
    update: {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      source: body.source,
    },
    create: {
      email: body.email,
      normalizedEmail,
      firstName: body.firstName,
      lastName: body.lastName,
      source: body.source,
      assignedAgentId: body.assignedAgentId,
    },
  });

  const suppression = await prisma.suppression.findFirst({ where: { leadId: lead.id, isActive: true } });
  if (suppression) return Response.json({ lead, skipped: "suppressed" });

  const activeRun = await prisma.sequenceRun.findFirst({ where: { leadId: lead.id, status: "ACTIVE" } });
  if (!activeRun) {
    const def = await prisma.sequenceDefinition.findFirst({ where: { active: true }, include: { steps: true } });
    if (!def) return Response.json({ error: "No active sequence definition" }, { status: 400 });

    const run = await prisma.sequenceRun.create({
      data: { leadId: lead.id, sequenceDefinitionId: def.id, status: "ACTIVE", currentStepOrder: 1 },
    });
    await enqueueSequenceRun(run.id, 1, 5);
  }

  await prisma.leadActivity.create({ data: { leadId: lead.id, actorUserId: auth.userId, activityType: "lead_ingested", payload: body } });
  return Response.json({ lead });
}
