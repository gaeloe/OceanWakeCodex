export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";

type RouteContext = { params: { id: string } | Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ template });
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  const body = await req.json();
  const template = await prisma.template.update({ where: { id }, data: body });
  return Response.json({ template });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  await prisma.template.delete({ where: { id } });
  return Response.json({ ok: true });
}
