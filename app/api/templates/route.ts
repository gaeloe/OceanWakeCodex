export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";

export async function GET() {
  return Response.json({ templates: await prisma.template.findMany({ orderBy: { updatedAt: "desc" } }) });
}

export async function POST(req: Request) {
  const body = await req.json();
  const template = await prisma.template.create({ data: body });
  return Response.json({ template });
}
