import sgMail from "@sendgrid/mail";
import crypto from "crypto";

sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? "");

export function buildReplyTo(threadToken: string) {
  const domain = process.env.REPLY_SUBDOMAIN ?? "reply.internal.local";
  return `${threadToken}@${domain}`;
}

export function buildUnsubscribeUrl(leadId: string) {
  const secret = process.env.UNSUBSCRIBE_SECRET ?? "dev-secret";
  const sig = crypto.createHmac("sha256", secret).update(leadId).digest("hex").slice(0, 24);
  return `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/unsubscribe/${leadId}.${sig}`;
}

export async function sendEmail(input: {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  threadToken: string;
  opaqueMessageId: string;
  leadId: string;
}) {
  const unsubscribeUrl = buildUnsubscribeUrl(input.leadId);
  await sgMail.send({
    to: input.to,
    from: input.from,
    subject: input.subject,
    text: `${input.text}\n\nUnsubscribe: ${unsubscribeUrl}`,
    html: `${input.html}<p style=\"font-size:12px;color:#666\">To stop these emails, <a href=\"${unsubscribeUrl}\">unsubscribe</a>.</p>`,
    replyTo: buildReplyTo(input.threadToken),
    customArgs: { message_ref: input.opaqueMessageId },
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
