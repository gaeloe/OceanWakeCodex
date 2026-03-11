import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/security";
import { enqueueSequenceRun } from "@/lib/sequence";
import { requireRole } from "@/lib/auth";
import { NextRequest } from "next/server";

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatTagLabel(raw: string) {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => formatTagLabel(String(item))).filter(Boolean)));
  }

  if (typeof value === "string") {
    return Array.from(new Set(value.split(/[,\n]/).map((item) => formatTagLabel(item)).filter(Boolean)));
  }

  return [];
}

export async function POST(req: NextRequest) {
  const ingestToken = process.env.LEAD_INGEST_TOKEN;
  const requestToken = req.headers.get("x-ingest-token");
  let actorUserId: string | undefined;

  if (ingestToken && requestToken && requestToken !== ingestToken) {
    return Response.json({ error: "invalid ingest token" }, { status: 401 });
  }

  if (!(ingestToken && requestToken === ingestToken)) {
    const auth = requireRole(req, ["ADMIN", "MANAGER", "AGENT"]);
    if (!auth.ok) return auth.response;
    actorUserId = auth.userId;
  }

  const body = await req.json();
  const normalizedEmail = normalizeEmail(body.email);
  const lead = await prisma.lead.upsert({
    where: { normalizedEmail },
    update: {
      email: body.email,
      firstName: optionalText(body.firstName),
      lastName: optionalText(body.lastName),
      phone: optionalText(body.phone),
      source: optionalText(body.source),
      country: optionalText(body.country),
      language: optionalText(body.language),
      propertyType: optionalText(body.propertyType),
      areaInterest: optionalText(body.areaInterest),
      budgetRange: optionalText(body.budgetRange),
      utmCampaign: optionalText(body.utmCampaign),
      notes: optionalText(body.notes),
    },
    create: {
      email: body.email,
      normalizedEmail,
      firstName: optionalText(body.firstName),
      lastName: optionalText(body.lastName),
      phone: optionalText(body.phone),
      source: optionalText(body.source),
      country: optionalText(body.country),
      language: optionalText(body.language),
      propertyType: optionalText(body.propertyType),
      areaInterest: optionalText(body.areaInterest),
      budgetRange: optionalText(body.budgetRange),
      utmCampaign: optionalText(body.utmCampaign),
      notes: optionalText(body.notes),
      assignedAgentId: body.assignedAgentId,
    },
  });

  const tags = parseTags(body.tags);
  await prisma.leadTag.deleteMany({ where: { leadId: lead.id } });
  if (tags.length) {
    const upserted = await Promise.all(
      tags.map((label) =>
        prisma.tag.upsert({
          where: { label },
          update: {},
          create: { label, type: "CUSTOM" },
        })
      )
    );
    await prisma.leadTag.createMany({
      data: upserted.map((tag) => ({ leadId: lead.id, tagId: tag.id })),
      skipDuplicates: true,
    });
  }

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

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      actorUserId,
      activityType: "lead_ingested",
      payload: { ...body, tags },
    },
  });
  return Response.json({ lead });
}
