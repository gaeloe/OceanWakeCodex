import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const template = await prisma.template.findUnique({ where: { id: params.id } });
  if (!template) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ template });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const template = await prisma.template.update({ where: { id: params.id }, data: body });
  return Response.json({ template });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.template.delete({ where: { id: params.id } });
  return Response.json({ ok: true });
}
