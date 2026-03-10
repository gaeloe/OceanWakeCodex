import { prisma } from "@/lib/db";
import { hashString } from "@/lib/security";
import { NextRequest } from "next/server";

function verifyInboundWebhook(req: NextRequest, rawBody: string) {
  const token = process.env.SENDGRID_INBOUND_TOKEN;
  if (!token) return true;
  return req.headers.get("x-sendgrid-inbound-token") === token && rawBody.length > 0;
}

function parseField(raw: string, field: string) {
  const rx = new RegExp(`name=\"${field}\"\\r\\n\\r\\n([\\s\\S]*?)\\r\\n--`, "m");
  return raw.match(rx)?.[1]?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyInboundWebhook(req, rawBody)) return Response.json({ error: "invalid signature" }, { status: 401 });

  const idempotencyKey = hashString(rawBody);
  const exists = await prisma.webhookReceipt.findUnique({ where: { idempotencyKey } });
  if (exists) return Response.json({ ok: true, deduped: true });

  await prisma.webhookReceipt.create({
    data: { provider: "sendgrid", eventType: "inbound", idempotencyKey, rawBody },
  });

  const to = parseField(rawBody, "to");
  const from = parseField(rawBody, "from");
  const subject = parseField(rawBody, "subject");
  const text = parseField(rawBody, "text");

  const tokenMatch = to.match(/([^@]+)@/);
  const threadToken = tokenMatch?.[1];
  if (!threadToken) return Response.json({ ok: true, skipped: "missing thread token" });

  const conversation = await prisma.conversation.findUnique({ where: { threadToken } });
  if (!conversation) return Response.json({ ok: true, skipped: "unknown thread" });

  await prisma.message.create({
    data: {
      leadId: conversation.leadId,
      conversationId: conversation.id,
      direction: "INBOUND",
      provider: "sendgrid",
      fromEmail: from,
      toEmail: to,
      subject,
      bodyText: text,
      receivedAt: new Date(),
    },
  });

  await prisma.sequenceRun.updateMany({
    where: { leadId: conversation.leadId, status: "ACTIVE" },
    data: { status: "STOPPED", stoppedAt: new Date(), stopReason: "reply" },
  });

  const lead = await prisma.lead.update({ where: { id: conversation.leadId }, data: { status: "REPLIED" } });
  await prisma.leadActivity.create({
    data: { leadId: lead.id, activityType: "inbound_reply", payload: { from, subject } },
  });

  if (lead.assignedAgentId) {
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        actorUserId: lead.assignedAgentId,
        activityType: "assigned_agent_notified",
        payload: { channel: "in-app" },
      },
    });
  }

  return Response.json({ ok: true });
}
