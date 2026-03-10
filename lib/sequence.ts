import { prisma } from "./db";
import { sendEmail } from "./email";
import { sequenceQueue } from "./queue";

const MINUTE = 60 * 1000;

export async function enqueueSequenceRun(sequenceRunId: string, stepOrder: number, delayMinutes: number) {
  await sequenceQueue.add(
    `sequence-run-${sequenceRunId}-step-${stepOrder}`,
    { sequenceRunId, stepOrder },
    { delay: delayMinutes * MINUTE, jobId: `${sequenceRunId}-${stepOrder}` },
  );
}

export async function runSequenceStep(sequenceRunId: string, stepOrder: number) {
  const run = await prisma.sequenceRun.findUnique({
    where: { id: sequenceRunId },
    include: {
      lead: { include: { suppressions: true, conversations: true } },
      sequenceDefinition: { include: { steps: { include: { template: true } } } },
    },
  });
  if (!run || run.status !== "ACTIVE") return;
  if (run.lead.suppressions.some((s) => s.isActive)) return;

  const step = run.sequenceDefinition.steps.find((s) => s.stepOrder === stepOrder);
  if (!step) return;

  const convo = run.lead.conversations[0] ?? (await prisma.conversation.create({
    data: { leadId: run.leadId, subject: step.template.subject, threadToken: `${run.leadId}-${Date.now()}` },
  }));

  const message = await prisma.message.create({
    data: {
      leadId: run.leadId,
      conversationId: convo.id,
      direction: "OUTBOUND",
      provider: "sendgrid",
      fromEmail: process.env.DEFAULT_FROM_EMAIL ?? "sales@agency.local",
      toEmail: run.lead.email,
      subject: step.template.subject,
      bodyText: step.template.bodyText,
      bodyHtml: step.template.bodyHtml,
      sentAt: new Date(),
    },
  });

  await sendEmail({
    to: run.lead.email,
    from: process.env.DEFAULT_FROM_EMAIL ?? "sales@agency.local",
    subject: step.template.subject,
    text: step.template.bodyText,
    html: step.template.bodyHtml,
    threadToken: convo.threadToken,
    opaqueMessageId: message.id,
    leadId: run.leadId,
  });

  const nextStep = run.sequenceDefinition.steps.find((s) => s.stepOrder === stepOrder + 1);
  if (nextStep) {
    await prisma.sequenceRun.update({ where: { id: run.id }, data: { currentStepOrder: nextStep.stepOrder } });
    await enqueueSequenceRun(run.id, nextStep.stepOrder, nextStep.delayMinutes);
  } else {
    await prisma.sequenceRun.update({ where: { id: run.id }, data: { status: "COMPLETED", stoppedAt: new Date(), stopReason: "sequence_completed" } });
  }
}
