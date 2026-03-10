export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <h2>Templates + Sequence Editor</h2>
      <p>Default linear sequence: immediate, +1 day, +3 days, +7 days, +14 days.</p>
      <ul>{templates.map((t) => <li key={t.id}>{t.name}</li>)}</ul>
    </div>
  );
}
