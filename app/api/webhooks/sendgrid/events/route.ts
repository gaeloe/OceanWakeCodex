import { prisma } from "@/lib/db";
import { hashString, normalizeEmail } from "@/lib/security";
import { NextRequest } from "next/server";

function verifyEventWebhook(req: NextRequest, rawBody: string) {
  const expected = process.env.SENDGRID_EVENTS_TOKEN;
  if (!expected) return true;
  return req.headers.get("x-sendgrid-token") === expected && rawBody.length > 0;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyEventWebhook(req, rawBody)) return Response.json({ error: "invalid signature" }, { status: 401 });

  const events = JSON.parse(rawBody) as Array<Record<string, unknown>>;
  for (const event of events) {
    const idempotencyKey = hashString(JSON.stringify(event));
    const exists = await prisma.webhookReceipt.findUnique({ where: { idempotencyKey } });
    if (exists) continue;

    await prisma.webhookReceipt.create({
      data: { provider: "sendgrid", eventType: String(event.event), idempotencyKey, rawBody: JSON.stringify(event) },
    });

    const messageRef = String((event["message_ref"] ?? event["sg_message_id"] ?? "") as string);
    const message = await prisma.message.findFirst({ where: { OR: [{ id: messageRef }, { providerMsgId: messageRef }] } });
    if (!message) continue;

    const eventType = String(event.event || "").toUpperCase();
    await prisma.messageEvent.create({
      data: {
        messageId: message.id,
        eventType: eventType as never,
        occurredAt: new Date(((event.timestamp as number) ?? Date.now() / 1000) * 1000),
        raw: event as never,
        webhookHash: idempotencyKey,
      },
    }).catch(() => undefined);

    if (["UNSUBSCRIBED", "SPAM_REPORT", "BOUNCED"].includes(eventType)) {
      const lead = await prisma.lead.findUnique({ where: { id: message.leadId } });
      if (lead) {
        await prisma.suppression.create({
          data: {
            leadId: lead.id,
            reason: eventType === "UNSUBSCRIBED" ? "UNSUBSCRIBE" : eventType === "SPAM_REPORT" ? "SPAM_REPORT" : "HARD_BOUNCE",
          },
        });
      }
      const run = await prisma.sequenceRun.findFirst({ where: { leadId: message.leadId, status: "ACTIVE" } });
      if (run) await prisma.sequenceRun.update({ where: { id: run.id }, data: { status: "STOPPED", stoppedAt: new Date(), stopReason: eventType.toLowerCase() } });
    }

    if (eventType === "REPLIED") {
      await prisma.lead.update({ where: { id: message.leadId }, data: { status: "REPLIED" } });
    }

    if (event.email) {
      await prisma.lead.updateMany({ where: { normalizedEmail: normalizeEmail(String(event.email)) }, data: {} });
    }
  }

  return Response.json({ ok: true });
}
