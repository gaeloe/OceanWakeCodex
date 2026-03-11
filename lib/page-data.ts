import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export const getDashboardData = unstable_cache(
  async () => {
    const [
      totalLeads,
      replied,
      unsubscribed,
      bounced,
      spam,
      activeSequences,
      pausedSequences,
      snoozedLeads,
      recentLeads,
      recentActivity,
      topTags,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "REPLIED" } }),
      prisma.suppression.count({ where: { reason: "UNSUBSCRIBE", isActive: true } }),
      prisma.suppression.count({ where: { reason: "HARD_BOUNCE", isActive: true } }),
      prisma.suppression.count({ where: { reason: "SPAM_REPORT", isActive: true } }),
      prisma.sequenceRun.count({ where: { status: "ACTIVE" } }),
      prisma.sequenceRun.count({ where: { status: "PAUSED" } }),
      prisma.lead.count({ where: { snoozedUntil: { gt: new Date() } } }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          assignedAgent: true,
          tags: { include: { tag: true } },
        },
      }),
      prisma.leadActivity.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { lead: true, actorUser: true },
      }),
      prisma.tag.findMany({
        orderBy: { leads: { _count: "desc" } },
        take: 6,
        include: { _count: { select: { leads: true } } },
      }),
    ]);

    return {
      totalLeads,
      replied,
      unsubscribed,
      bounced,
      spam,
      activeSequences,
      pausedSequences,
      snoozedLeads,
      recentLeads,
      recentActivity,
      topTags,
    };
  },
  ["dashboard-data"],
  { revalidate: 30 }
);

export const getTemplatesData = unstable_cache(
  async () => prisma.template.findMany({ orderBy: [{ category: "asc" }, { updatedAt: "desc" }] }),
  ["templates-data"],
  { revalidate: 60 }
);

export const getLeadDetailData = unstable_cache(
  async (leadId: string) => {
    const [lead, agents, templates, tags] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          assignedAgent: true,
          activities: { orderBy: { createdAt: "desc" } },
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              events: { orderBy: { occurredAt: "asc" } },
            },
          },
          sequenceRuns: {
            orderBy: { createdAt: "desc" },
            include: {
              sequenceDefinition: {
                include: {
                  steps: {
                    orderBy: { stepOrder: "asc" },
                    include: { template: true },
                  },
                },
              },
            },
          },
          suppressions: { orderBy: { createdAt: "desc" } },
          tags: {
            orderBy: { tag: { label: "asc" } },
            include: { tag: true },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.template.findMany({
        orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
        take: 12,
      }),
      prisma.tag.findMany({
        orderBy: [{ type: "asc" }, { label: "asc" }],
      }),
    ]);

    return { lead, agents, templates, tags };
  },
  ["lead-detail-data"],
  { revalidate: 20 }
);

export const getLeadsPageData = unstable_cache(
  async (query: string, status: string) =>
    prisma.lead.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: "insensitive" } },
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { source: { contains: query, mode: "insensitive" } },
                { country: { contains: query, mode: "insensitive" } },
                { areaInterest: { contains: query, mode: "insensitive" } },
                { tags: { some: { tag: { label: { contains: query, mode: "insensitive" } } } } },
              ],
            }
          : {}),
        ...(status !== "ALL" ? { status: status as "NEW" | "CONTACTED" | "REPLIED" | "CLOSED" } : {}),
      },
      orderBy: [{ snoozedUntil: "asc" }, { updatedAt: "desc" }],
      take: 50,
      include: {
        assignedAgent: true,
        sequenceRuns: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        suppressions: {
          where: { isActive: true },
        },
        tags: {
          include: { tag: true },
          orderBy: { tag: { label: "asc" } },
        },
      },
    }),
  ["leads-page-data"],
  { revalidate: 15 }
);

export const getQueueData = unstable_cache(
  async () =>
    prisma.lead.findMany({
      where: {
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: new Date() } }],
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 40,
      include: {
        assignedAgent: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { events: true },
        },
        sequenceRuns: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        suppressions: {
          where: { isActive: true },
        },
        tags: {
          include: { tag: true },
          orderBy: { tag: { label: "asc" } },
        },
      },
    }),
  ["queue-data"],
  { revalidate: 10 }
);
