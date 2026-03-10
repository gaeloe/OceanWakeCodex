import { NextRequest } from "next/server";

export type Role = "ADMIN" | "MANAGER" | "AGENT";

export function requireRole(request: NextRequest, allowed: Role[]) {
  const role = (request.headers.get("x-user-role") ?? "AGENT") as Role;
  const userId = request.headers.get("x-user-id") ?? undefined;
  if (!allowed.includes(role)) {
    return { ok: false as const, response: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, role, userId };
}
