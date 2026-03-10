import { prisma } from "@/lib/db";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  await prisma.sequenceRun.updateMany({ where: { leadId: params.id, status: "ACTIVE" }, data: { status: "PAUSED" } });
  return Response.json({ ok: true });
}
