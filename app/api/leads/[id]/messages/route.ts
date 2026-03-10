import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request, context: { params: { id: string } | Promise<{ id: string }> }) {
  const resolved = await Promise.resolve(context.params);
  const body = await req.json();
  const lead = await prisma.lead.findUnique({ where: { id: resolved.id }, include: { conversations: true } });
  if (!lead) return Response.json({ error: "not found" }, { status: 404 });

  const conversation = lead.conversations[0] ?? (await prisma.conversation.create({
    data: { leadId: lead.id, subject: body.subject, threadToken: `${lead.id}-${Date.now()}` },
  }));

  const msg = await prisma.message.create({
    data: {
      leadId: lead.id,
      conversationId: conversation.id,
      direction: "OUTBOUND",
      provider: "sendgrid",
      fromEmail: process.env.DEFAULT_FROM_EMAIL ?? "sales@agency.local",
      toEmail: lead.email,
      subject: body.subject,
      bodyText: body.bodyText,
      bodyHtml: body.bodyHtml,
      sentAt: new Date(),
    },
  });

  await sendEmail({
    to: lead.email,
    from: msg.fromEmail,
    subject: body.subject,
    text: body.bodyText,
    html: body.bodyHtml ?? `<p>${body.bodyText}</p>`,
    threadToken: conversation.threadToken,
    opaqueMessageId: msg.id,
    leadId: lead.id,
  });

  return Response.json({ message: msg });
}
