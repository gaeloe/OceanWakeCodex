import { prisma } from "@/lib/db";
import { hashString } from "@/lib/security";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const body = await req.json().catch(() => ({}));
  await prisma.leadActivity.create({
    data: {
      leadId: body.leadId ?? "unknown",
      activityType: "tracked_click",
      payload: { tokenHash: hashString(params.token) },
    },
  }).catch(() => undefined);
  return Response.json({ ok: true });
}
