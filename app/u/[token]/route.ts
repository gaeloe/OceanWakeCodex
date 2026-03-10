import { prisma } from "@/lib/db";
import { hashString } from "@/lib/security";

export async function POST(req: Request, context: { params: { token: string } | Promise<{ token: string }> }) {
  const resolved = await Promise.resolve(context.params);
  const body = await req.json().catch(() => ({}));
  await prisma.leadActivity.create({
    data: {
      leadId: body.leadId ?? "unknown",
      activityType: "tracked_click",
      payload: { tokenHash: hashString(resolved.token) },
    },
  }).catch(() => undefined);
  return Response.json({ ok: true });
}
