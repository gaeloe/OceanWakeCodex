"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function assignLeadAction(formData: FormData) {
  const leadId = textValue(formData, "leadId");
  const agentId = textValue(formData, "agentId");

  if (!leadId) return;

  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedAgentId: agentId || null },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      activityType: "lead_assigned",
      payload: { agentId: agentId || null },
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
}

export async function updateSequenceStatusAction(formData: FormData) {
  const leadId = textValue(formData, "leadId");
  const action = textValue(formData, "action");

  if (!leadId || !action) return;

  if (action === "pause") {
    await prisma.sequenceRun.updateMany({
      where: { leadId, status: "ACTIVE" },
      data: { status: "PAUSED" },
    });
  }

  if (action === "resume") {
    await prisma.sequenceRun.updateMany({
      where: { leadId, status: "PAUSED" },
      data: { status: "ACTIVE" },
    });
  }

  if (action === "stop") {
    await prisma.sequenceRun.updateMany({
      where: { leadId, status: { in: ["ACTIVE", "PAUSED"] } },
      data: { status: "STOPPED", stoppedAt: new Date(), stopReason: "manual_stop" },
    });
  }

  await prisma.leadActivity.create({
    data: {
      leadId,
      activityType: `sequence_${action}`,
      payload: { action },
    },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
}

export async function sendLeadMessageAction(formData: FormData) {
  const leadId = textValue(formData, "leadId");
  const subject = textValue(formData, "subject");
  const bodyText = textValue(formData, "bodyText");

  if (!leadId || !subject || !bodyText) return;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { conversations: true },
  });

  if (!lead) return;

  const conversation =
    lead.conversations[0] ??
    (await prisma.conversation.create({
      data: {
        leadId: lead.id,
        subject,
        threadToken: `${lead.id}-${Date.now()}`,
      },
    }));

  const fromEmail = process.env.DEFAULT_FROM_EMAIL ?? "sales@agency.local";
  const bodyHtml = `<p>${bodyText.replace(/\n/g, "<br />")}</p>`;

  const message = await prisma.message.create({
    data: {
      leadId: lead.id,
      conversationId: conversation.id,
      direction: "OUTBOUND",
      provider: "sendgrid",
      fromEmail,
      toEmail: lead.email,
      subject,
      bodyText,
      bodyHtml,
      sentAt: new Date(),
    },
  });

  await sendEmail({
    to: lead.email,
    from: fromEmail,
    subject,
    text: bodyText,
    html: bodyHtml,
    threadToken: conversation.threadToken,
    opaqueMessageId: message.id,
    leadId: lead.id,
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      activityType: "manual_message_sent",
      payload: { subject },
    },
  });

  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/dashboard");
}

export async function saveTemplateAction(formData: FormData) {
  const templateId = textValue(formData, "templateId");
  const name = textValue(formData, "name");
  const subject = textValue(formData, "subject");
  const bodyText = textValue(formData, "bodyText");

  if (!name || !subject || !bodyText) return;

  const data = {
    name,
    subject,
    bodyText,
    bodyHtml: `<p>${bodyText.replace(/\n/g, "<br />")}</p>`,
  };

  if (templateId) {
    await prisma.template.update({
      where: { id: templateId },
      data,
    });
  } else {
    await prisma.template.create({ data });
  }

  revalidatePath("/templates");
}

export async function deleteTemplateAction(formData: FormData) {
  const templateId = textValue(formData, "templateId");
  if (!templateId) return;

  await prisma.template.delete({ where: { id: templateId } });
  revalidatePath("/templates");
}
