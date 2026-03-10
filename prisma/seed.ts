import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const templates = await Promise.all([
    prisma.template.create({ data: { name: "Step 1", subject: "Quick intro", bodyText: "Hi from Phuket real estate.", bodyHtml: "<p>Hi from Phuket real estate.</p>" } }),
    prisma.template.create({ data: { name: "Step 2", subject: "Following up", bodyText: "Checking in.", bodyHtml: "<p>Checking in.</p>" } }),
    prisma.template.create({ data: { name: "Step 3", subject: "Any questions?", bodyText: "Happy to help.", bodyHtml: "<p>Happy to help.</p>" } }),
    prisma.template.create({ data: { name: "Step 4", subject: "Property shortlist", bodyText: "Here are options.", bodyHtml: "<p>Here are options.</p>" } }),
    prisma.template.create({ data: { name: "Step 5", subject: "Final follow-up", bodyText: "Last check-in.", bodyHtml: "<p>Last check-in.</p>" } }),
  ]);

  const def = await prisma.sequenceDefinition.create({ data: { name: "Default phase1 sequence", active: true } });
  const delays = [5, 60 * 24, 60 * 24 * 3, 60 * 24 * 7, 60 * 24 * 14];

  for (let i = 0; i < templates.length; i++) {
    await prisma.sequenceStep.create({
      data: {
        sequenceDefinitionId: def.id,
        stepOrder: i + 1,
        delayMinutes: delays[i],
        templateId: templates[i].id,
      },
    });
  }
}

main().finally(() => prisma.$disconnect());
