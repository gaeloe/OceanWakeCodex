import { prisma } from "@/lib/db";

export default async function AuditLogPage() {
  const rows = await prisma.leadActivity.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <h2>Audit Log</h2>
      <ul>{rows.map((r) => <li key={r.id}>{r.activityType} - {new Date(r.createdAt).toLocaleString()}</li>)}</ul>
    </div>
  );
}
