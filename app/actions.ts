"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/security";
import { enqueueSequenceRun } from "@/lib/sequence";

type TagTypeValue = "PIPELINE" | "QUALIFICATION" | "SOURCE" | "PRIORITY" | "CUSTOM";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value || null;
}

function htmlFromText(text: string) {
  return `<p>${text.replace(/\n/g, "<br />")}</p>`;
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
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

function parseTags(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(/[,\n]/)
        .map((value) => formatTagLabel(value))
        .filter(Boolean)
    )
  );
}

function inferTagType(label: string): TagTypeValue {
  const value = label.toLowerCase();

  if (["hot", "warm", "cold", "vip", "urgent"].includes(value)) return "PRIORITY";
  if (["qualified", "unqualified", "viewing", "investor", "owneroccupier", "owner occupier"].includes(value)) {
    return "QUALIFICATION";
  }
  if (["website", "google sheets", "manual import", "referral", "meta ads", "google ads"].includes(value)) {
    return "SOURCE";
  }
  if (["new", "contacted", "replied", "closed"].includes(value)) return "PIPELINE";

  return "CUSTOM";
}

function parseSnoozeHours(value: string) {
  const parsed = Number(value || "4");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
}

async function syncLeadTags(leadId: string, rawTags: string) {
  const labels = parseTags(rawTags);

  await prisma.leadTag.deleteMany({ where: { leadId } });
  if (!labels.length) return [];

  const tags = await Promise.all(
    labels.map((label) =>
      prisma.tag.upsert({
        where: { label },
        update: {},
        create: {
          label,
          type: inferTagType(label),
        },
      })
    )
  );

  await prisma.leadTag.createMany({
    data: tags.map((tag) => ({ leadId, tagId: tag.id })),
    skipDuplicates: true,
  });

  return labels;
}

async function ensureLeadSequence(leadId: string) {
  const suppression = await prisma.suppression.findFirst({ where: { leadId, isActive: true } });
  if (suppression) return;

  const activeRun = await prisma.sequenceRun.findFirst({ where: { leadId, status: "ACTIVE" } });
  if (activeRun) return;

  const def = await prisma.sequenceDefinition.findFirst({ where: { active: true }, include: { steps: true } });
  if (!def) return;

  const run = await prisma.sequenceRun.create({
    data: { leadId, sequenceDefinitionId: def.id, status: "ACTIVE", currentStepOrder: 1 },
  });
  await enqueueSequenceRun(run.id, 1, 5);
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

  revalidatePath("/queue");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
}

export async function updateLeadContextAction(formData: FormData) {
  const leadId = textValue(formData, "leadId");
  if (!leadId) return;

  const update = {
    firstName: optionalText(textValue(formData, "firstName")),
    lastName: optionalText(textValue(formData, "lastName")),
    phone: optionalText(textValue(formData, "phone")),
    source: optionalText(textValue(formData, "source")),
    country: optionalText(textValue(formData, "country")),
    language: optionalText(textValue(formData, "language")),
    propertyType: optionalText(textValue(formData, "propertyType")),
    areaInterest: optionalText(textValue(formData, "areaInterest")),
    budgetRange: optionalText(textValue(formData, "budgetRange")),
    utmCampaign: optionalText(textValue(formData, "utmCampaign")),
    notes: optionalText(textValue(formData, "notes")),
    status: (textValue(formData, "status") || "NEW") as "NEW" | "CONTACTED" | "REPLIED" | "CLOSED",
    snoozedUntil: textValue(formData, "clearSnooze") ? null : undefined,
  };

  await prisma.lead.update({
    where: { id: leadId },
    data: update,
  });

  const tagLabels = await syncLeadTags(leadId, textValue(formData, "tags"));

  await prisma.leadActivity.create({
    data: {
      leadId,
      activityType: "lead_context_updated",
      payload: { ...update, tags: tagLabels },
    },
  });

  revalidatePath("/queue");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}?saved=1`);
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

  revalidatePath("/queue");
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
  const bodyHtml = htmlFromText(bodyText);

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

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: lead.status === "NEW" ? "CONTACTED" : lead.status,
      snoozedUntil: null,
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

  revalidatePath("/queue");
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/dashboard");
  redirect(`/leads/${lead.id}?sent=1`);
}

export async function saveTemplateAction(formData: FormData) {
  const templateId = textValue(formData, "templateId");
  const name = textValue(formData, "name");
  const category = (textValue(formData, "category") || "MANUAL") as
    | "FIRST_TOUCH"
    | "FOLLOW_UP"
    | "REPLY"
    | "NURTURE"
    | "MANUAL";
  const subject = textValue(formData, "subject");
  const bodyText = textValue(formData, "bodyText");

  if (!name || !subject || !bodyText) return;

  const data = {
    name,
    category,
    subject,
    bodyText,
    bodyHtml: htmlFromText(bodyText),
  };

  if (templateId) {
    await prisma.template.update({
      where: { id: templateId },
      data,
    });
  } else {
    const template = await prisma.template.create({ data });
    revalidatePath("/templates");
    redirect(`/templates?template=${template.id}`);
  }

  revalidatePath("/templates");
}

export async function deleteTemplateAction(formData: FormData) {
  const templateId = textValue(formData, "templateId");
  if (!templateId) return;

  const linkedSteps = await prisma.sequenceStep.count({
    where: { templateId },
  });

  if (linkedSteps > 0) {
    redirect(`/templates?template=${templateId}&deleteError=in_use`);
  }

  await prisma.template.delete({ where: { id: templateId } });
  revalidatePath("/templates");
  redirect("/templates?deleted=1");
}

export async function snoozeLeadAction(formData: FormData) {
  const leadId = textValue(formData, "leadId");
  const snoozeHours = parseSnoozeHours(textValue(formData, "hours"));
  if (!leadId) return;

  const until = new Date(Date.now() + snoozeHours * 60 * 60 * 1000);

  await prisma.lead.update({
    where: { id: leadId },
    data: { snoozedUntil: until },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      activityType: `lead_snoozed_${snoozeHours}h`,
      payload: { until: until.toISOString(), hours: snoozeHours },
    },
  });

  revalidatePath("/queue");
  revalidatePath(`/leads/${leadId}`);
}

export async function importLeadsAction(formData: FormData) {
  const sourceOverride = textValue(formData, "source");
  const rawRows = textValue(formData, "rows");

  if (!rawRows) {
    redirect("/settings?imported=0");
  }

  const lines = rawRows
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    redirect("/settings?imported=0");
  }

  const rawHeader = parseCsvLine(lines[0]);
  const header = rawHeader.map(normalizeHeader);
  const hasHeader = header.includes("email");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  let imported = 0;

  const getCell = (cells: string[], ...names: string[]) => {
    if (!hasHeader) return "";

    for (const name of names) {
      const index = header.indexOf(normalizeHeader(name));
      if (index >= 0) return cells[index] || "";
    }

    return "";
  };

  for (const line of dataLines) {
    const cells = parseCsvLine(line);
    const email = (hasHeader ? getCell(cells, "email") : cells[0])?.trim();
    if (!email) continue;

    const normalizedEmail = normalizeEmail(email);
    const firstName = hasHeader ? getCell(cells, "firstName", "first_name") : cells[1] || "";
    const lastName = hasHeader ? getCell(cells, "lastName", "last_name") : cells[2] || "";
    const source = hasHeader ? getCell(cells, "source") || sourceOverride : cells[3] || sourceOverride;
    const phone = hasHeader ? getCell(cells, "phone", "phoneNumber", "phone_number") : "";
    const country = hasHeader ? getCell(cells, "country") : "";
    const language = hasHeader ? getCell(cells, "language") : "";
    const propertyType = hasHeader ? getCell(cells, "propertyType", "property_type") : "";
    const areaInterest = hasHeader ? getCell(cells, "areaInterest", "area_interest") : "";
    const budgetRange = hasHeader ? getCell(cells, "budgetRange", "budget_range") : "";
    const utmCampaign = hasHeader ? getCell(cells, "utmCampaign", "utm_campaign") : "";
    const notes = hasHeader ? getCell(cells, "notes") : "";
    const tags = hasHeader ? getCell(cells, "tags") : "";

    const lead = await prisma.lead.upsert({
      where: { normalizedEmail },
      update: {
        email,
        firstName: optionalText(firstName),
        lastName: optionalText(lastName),
        source: optionalText(source || "Manual import"),
        phone: optionalText(phone),
        country: optionalText(country),
        language: optionalText(language),
        propertyType: optionalText(propertyType),
        areaInterest: optionalText(areaInterest),
        budgetRange: optionalText(budgetRange),
        utmCampaign: optionalText(utmCampaign),
        notes: optionalText(notes),
      },
      create: {
        email,
        normalizedEmail,
        firstName: optionalText(firstName),
        lastName: optionalText(lastName),
        source: optionalText(source || "Manual import"),
        phone: optionalText(phone),
        country: optionalText(country),
        language: optionalText(language),
        propertyType: optionalText(propertyType),
        areaInterest: optionalText(areaInterest),
        budgetRange: optionalText(budgetRange),
        utmCampaign: optionalText(utmCampaign),
        notes: optionalText(notes),
      },
    });

    const tagLabels = await syncLeadTags(lead.id, tags);

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: "lead_imported_manual",
        payload: { source: source || "Manual import", tags: tagLabels },
      },
    });

    await ensureLeadSequence(lead.id);
    imported += 1;
  }

  revalidatePath("/queue");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  redirect(`/settings?imported=${imported}`);
}

export async function generateTemplateAction(formData: FormData) {
  const campaign = textValue(formData, "campaign");
  const audience = textValue(formData, "audience");
  const tone = textValue(formData, "tone");
  const offer = textValue(formData, "offer");
  const goal = textValue(formData, "goal");
  const category = (textValue(formData, "category") || "FIRST_TOUCH") as
    | "FIRST_TOUCH"
    | "FOLLOW_UP"
    | "REPLY"
    | "NURTURE"
    | "MANUAL";

  if (!campaign || !audience || !offer) {
    redirect("/templates?generated=0");
  }

  let subject = `${campaign}: quick introduction`;
  let bodyText = `Hi,\n\nI wanted to reach out regarding ${offer}.\n\nIf helpful, I can share a concise shortlist and answer questions.\n\nBest,\nOcean Wake`;

  if (process.env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You write concise outbound real-estate lead nurture emails. Return JSON with keys name, subject, bodyText. Keep it practical, warm, and specific.",
          },
          {
            role: "user",
            content: `Campaign: ${campaign}\nAudience: ${audience}\nTone: ${tone || "professional and warm"}\nOffer: ${offer}\nGoal: ${goal || "encourage a reply"}\nCategory: ${category}\nWrite one email template.`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "template_draft",
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                subject: { type: "string" },
                bodyText: { type: "string" },
              },
              required: ["name", "subject", "bodyText"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (response.ok) {
      const payload = await response.json();
      const outputText = payload.output_text as string | undefined;
      if (outputText) {
        const parsed = JSON.parse(outputText) as { name?: string; subject?: string; bodyText?: string };
        subject = parsed.subject || subject;
        bodyText = parsed.bodyText || bodyText;

        const template = await prisma.template.create({
          data: {
            name: parsed.name || `${campaign} AI draft`,
            category,
            subject,
            bodyText,
            bodyHtml: htmlFromText(bodyText),
          },
        });

        revalidatePath("/templates");
        redirect(`/templates?template=${template.id}&generated=1`);
      }
    }
  }

  const template = await prisma.template.create({
    data: {
      name: `${campaign} draft`,
      category,
      subject,
      bodyText,
      bodyHtml: htmlFromText(bodyText),
    },
  });

  revalidatePath("/templates");
  redirect(`/templates?template=${template.id}&generated=1`);
}
