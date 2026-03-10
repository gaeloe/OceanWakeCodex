import { prisma } from "@/lib/db";
import { verifySignedToken } from "@/lib/security";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const [leadId, sig] = params.token.split(".");
  if (!leadId || !sig || !verifySignedToken(leadId, sig, process.env.UNSUBSCRIBE_SECRET ?? "dev-secret")) {
    return new Response("Invalid unsubscribe token", { status: 400 });
  }

  await prisma.suppression.create({ data: { leadId, reason: "UNSUBSCRIBE", isActive: true } });
  await prisma.sequenceRun.updateMany({ where: { leadId, status: "ACTIVE" }, data: { status: "STOPPED", stopReason: "unsubscribe", stoppedAt: new Date() } });
  return new Response("You are now unsubscribed.", { status: 200 });
}
