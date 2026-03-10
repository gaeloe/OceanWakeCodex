import { prisma } from "@/lib/db";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  await prisma.sequenceRun.updateMany({
    where: { leadId: params.id, status: { in: ["ACTIVE", "PAUSED"] } },
    data: { status: "STOPPED", stoppedAt: new Date(), stopReason: "manual_stop" },
  });
  return Response.json({ ok: true });
}
