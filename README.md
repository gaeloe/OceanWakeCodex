# Ocean Lead Responder (Phase 1)

Internal lead-response app for Phuket real estate agency.

## Stack
- Next.js app router
- PostgreSQL + Prisma
- Redis + BullMQ for scheduled sequence jobs
- SendGrid outbound and webhooks
- Header-based internal auth with RBAC (ADMIN/MANAGER/AGENT)

## Required endpoints implemented
- POST `/api/leads/ingest`
- POST `/api/webhooks/sendgrid/events`
- POST `/api/webhooks/sendgrid/inbound`
- POST `/u/:token`
- GET `/unsubscribe/:token`
- GET `/api/leads`
- GET `/api/leads/:id`
- POST `/api/leads/:id/messages`
- POST `/api/leads/:id/assign`
- POST `/api/leads/:id/sequence/pause`
- POST `/api/leads/:id/sequence/resume`
- POST `/api/leads/:id/sequence/stop`
- CRUD `/api/templates`
- GET `/api/dashboard/summary`

## Key behavior
- Dedupes leads by `normalizedEmail`
- Enforces one active sequence run per lead
- First email scheduled at +5 minutes
- Linear sequence delays: +1d, +3d, +7d, +14d then stop
- Stops sequence on reply, unsubscribe, spam report, hard bounce, or manual stop
- Includes list-unsubscribe headers and visible footer unsubscribe link
- Uses opaque message IDs only in SendGrid `customArgs`
- Verifies webhook signatures from raw bodies (shared-token placeholder)
- Idempotent webhook storage via unique receipt hash
- Full lead timeline UI (activities + messages)
- Dashboard summary for SLA/reply/unsub/bounce/spam rates

## Environment
- `DATABASE_URL`
- `REDIS_URL`
- `SENDGRID_API_KEY`
- `SENDGRID_EVENTS_TOKEN`
- `SENDGRID_INBOUND_TOKEN`
- `DEFAULT_FROM_EMAIL`
- `REPLY_SUBDOMAIN`
- `UNSUBSCRIBE_SECRET`
- `APP_BASE_URL`
- `ENABLE_QUEUE_WORKER`


## Vercel
- This repository is a **Next.js** app (see `vercel.json`) and should be deployed with the Next.js framework preset.
- Ensure production env vars are configured in Vercel before first deploy, especially `DATABASE_URL` and `REDIS_URL`.
