export const revalidate = 300;

import { importLeadsAction } from "@/app/actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { imported?: string } | Promise<{ imported?: string }>;
}) {
  const resolved = await Promise.resolve(searchParams);
  const importedCount = Number(resolved?.imported ?? "");
  const hasImportMessage = Number.isFinite(importedCount);
  const appBaseUrl = process.env.APP_BASE_URL || "https://your-app-domain";
  const ingestUrl = `${appBaseUrl}/api/leads/ingest`;
  const hasIngestToken = Boolean(process.env.LEAD_INGEST_TOKEN);
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);

  const appsScriptSnippet = `function sendLead(row) {
  const url = "${ingestUrl}";

  const payload = {
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    source: row.source || "Google Sheets"
  };

  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-ingest-token": "YOUR_LEAD_INGEST_TOKEN"
    },
    payload: JSON.stringify(payload)
  });
}`;

  return (
    <>
      <section className="panel hero">
        <div>
          <p className="brand-eyebrow" style={{ color: "var(--accent)" }}>
            Operations Setup
          </p>
          <h1>Settings</h1>
          <p className="section-copy">
            Import leads, connect Google Sheets, and configure AI-assisted template drafting.
          </p>
        </div>
      </section>

      <section className="grid-2">
        <div className="detail-stack">
          <section className="panel pad">
            <h2 className="section-title">Manual lead import</h2>
            <p className="section-copy">
              Paste one lead per line as `email,firstName,lastName,source`, or include a header row with `email`.
            </p>

            {hasImportMessage ? (
              <div className="empty">Imported {importedCount} leads from the latest manual upload.</div>
            ) : null}

            <form action={importLeadsAction} className="form-grid">
              <input className="input" name="source" placeholder="Default source label, e.g. Manual Import" />
              <textarea
                className="textarea"
                name="rows"
                placeholder={`email,firstName,lastName,source\njane@example.com,Jane,Doe,Google Sheets`}
                required
              />
              <button className="button" type="submit">Import leads</button>
            </form>
          </section>

          <section className="panel pad">
            <h2 className="section-title">Google Sheets webhook</h2>
            <p className="section-copy">
              Use the existing ingest route so rows from Sheets can be pushed into the tool automatically.
            </p>

            <div className="list">
              <div className="list-item">
                <strong>POST endpoint</strong>
                <div className="code-block">{ingestUrl}</div>
              </div>
              <div className="list-item">
                <strong>Auth header</strong>
                <div className="code-block">x-ingest-token: YOUR_LEAD_INGEST_TOKEN</div>
                <div className="muted" style={{ marginTop: 8 }}>
                  {hasIngestToken
                    ? "LEAD_INGEST_TOKEN is configured. You can use token-based ingest now."
                    : "Set LEAD_INGEST_TOKEN in Vercel before using Google Sheets webhook ingest."}
                </div>
              </div>
              <div className="list-item">
                <strong>Apps Script example</strong>
                <pre className="code-block">{appsScriptSnippet}</pre>
              </div>
            </div>
          </section>
        </div>

        <div className="detail-stack">
          <section className="panel pad">
            <h2 className="section-title">AI template drafting</h2>
            <p className="section-copy">
              AI drafts are generated from the Templates page. You give campaign context and the tool creates a first pass.
            </p>
            <div className="list">
              <div className="list-item">
                <strong>Current status</strong>
                <div className="muted" style={{ marginTop: 8 }}>
                  {hasOpenAi
                    ? "OPENAI_API_KEY is configured. AI template generation is enabled."
                    : "OPENAI_API_KEY is not configured. The app will fall back to a structured non-AI draft."}
                </div>
              </div>
              <div className="list-item">
                <strong>Recommended env vars</strong>
                <div className="code-block">OPENAI_API_KEY</div>
                <div className="code-block" style={{ marginTop: 8 }}>OPENAI_MODEL=gpt-4.1-mini</div>
              </div>
              <div className="list-item">
                <strong>Next step</strong>
                <a className="button" href="/templates">Open template studio</a>
              </div>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
