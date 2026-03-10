import { prisma } from "@/lib/db";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  await prisma.sequenceRun.updateMany({ where: { leadId: params.id, status: "PAUSED" }, data: { status: "ACTIVE" } });
  return Response.json({ ok: true });
}
