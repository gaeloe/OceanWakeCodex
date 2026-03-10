import { prisma } from "@/lib/db";

export async function POST(_: Request, context: { params: { id: string } | Promise<{ id: string }> }) {
  const resolved = await Promise.resolve(context.params);
  await prisma.sequenceRun.updateMany({ where: { leadId: resolved.id, status: "PAUSED" }, data: { status: "ACTIVE" } });
  return Response.json({ ok: true });
}
