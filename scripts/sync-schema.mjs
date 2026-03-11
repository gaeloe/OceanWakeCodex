import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `DO $$ BEGIN
     CREATE TYPE "TagType" AS ENUM ('PIPELINE', 'QUALIFICATION', 'SOURCE', 'PRIORITY', 'CUSTOM');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$;`,
  `DO $$ BEGIN
     CREATE TYPE "TemplateCategory" AS ENUM ('FIRST_TOUCH', 'FOLLOW_UP', 'REPLY', 'NURTURE', 'MANUAL');
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $$;`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "phone" TEXT;`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "country" TEXT;`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "language" TEXT;`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "propertyType" TEXT;`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "areaInterest" TEXT;`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "budgetRange" TEXT;`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "notes" TEXT;`,
  `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "snoozedUntil" TIMESTAMPTZ;`,
  `ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "category" "TemplateCategory" NOT NULL DEFAULT 'MANUAL';`,
  `CREATE TABLE IF NOT EXISTS "Tag" (
     "id" TEXT NOT NULL,
     "label" TEXT NOT NULL,
     "type" "TagType" NOT NULL DEFAULT 'CUSTOM',
     "color" TEXT,
     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
   );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Tag_label_key" ON "Tag"("label");`,
  `CREATE TABLE IF NOT EXISTS "LeadTag" (
     "leadId" TEXT NOT NULL,
     "tagId" TEXT NOT NULL,
     "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "LeadTag_pkey" PRIMARY KEY ("leadId","tagId"),
     CONSTRAINT "LeadTag_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
     CONSTRAINT "LeadTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE
   );`,
  `CREATE INDEX IF NOT EXISTS "LeadTag_tagId_idx" ON "LeadTag"("tagId");`,
];

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log("Schema sync complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
