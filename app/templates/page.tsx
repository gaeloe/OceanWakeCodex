export const dynamic = "force-dynamic";
export const revalidate = 60;

import { deleteTemplateAction, generateTemplateAction, saveTemplateAction } from "@/app/actions";
import { getTemplatesData } from "@/lib/page-data";

const categoryOptions = ["FIRST_TOUCH", "FOLLOW_UP", "REPLY", "NURTURE", "MANUAL"] as const;

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?:
    | { template?: string; generated?: string; deleted?: string; deleteError?: string }
    | Promise<{ template?: string; generated?: string; deleted?: string; deleteError?: string }>;
}) {
  const resolved = await Promise.resolve(searchParams);
  const templates = await getTemplatesData();
  const selectedTemplate = templates.find((template) => template.id === resolved?.template) ?? templates[0] ?? null;
  const generated = resolved?.generated === "1";
  const deleted = resolved?.deleted === "1";
  const deleteError = resolved?.deleteError === "in_use";

  return (
    <>
      <section className="panel hero">
        <div>
          <p className="brand-eyebrow" style={{ color: "var(--accent)" }}>
            Message Library
          </p>
          <h1>Templates</h1>
          <p className="section-copy">
            Organize templates by workflow stage so agents can insert better responses without rewriting from scratch.
          </p>
        </div>
        <div className="pill">{templates.length} templates</div>
      </section>

      <section className="detail-grid">
        <section className="panel pad">
          <div className="toolbar">
            <div>
              <h2 className="section-title">Template list</h2>
              <p className="section-copy">Categories make the composer palette easier to scan under pressure.</p>
            </div>
            <a className="button secondary" href="/templates">
              New template
            </a>
          </div>

          {templates.length ? (
            <ul className="list">
              {templates.map((template) => (
                <li className="list-item" key={template.id}>
                  <div className="list-row">
                    <div>
                      <strong>{template.name}</strong>
                      <div className="muted">{template.subject}</div>
                      <div style={{ marginTop: 8 }}>
                        <span className="pill">{template.category.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                    <a className="button secondary" href={`/templates?template=${template.id}`}>
                      Edit
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">No templates created yet.</div>
          )}
        </section>

        <div className="detail-stack">
          <section className="panel pad">
            <h2 className="section-title">Generate with AI</h2>
            <p className="section-copy">Describe the campaign and the tool creates a categorized draft you can use in the queue.</p>

            <form action={generateTemplateAction} className="form-grid">
              <input className="input" name="campaign" placeholder="Campaign name" required />
              <input className="input" name="audience" placeholder="Audience or lead type" required />
              <input className="input" name="offer" placeholder="Offer, property angle, or call to action" required />
              <select className="select" name="category" defaultValue="FIRST_TOUCH">
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input className="input" name="tone" placeholder="Tone, e.g. warm and concise" />
              <textarea className="textarea" name="goal" placeholder="Goal or extra context for the draft" />
              <button className="button" type="submit">
                Generate draft
              </button>
            </form>

            <div className="muted" style={{ marginTop: 12 }}>
              {process.env.OPENAI_API_KEY
                ? "AI generation is enabled with your configured OpenAI key."
                : "OPENAI_API_KEY is not configured, so the tool will fall back to a structured non-AI draft."}
            </div>
          </section>

          <section className="panel pad">
            <h2 className="section-title">{selectedTemplate ? "Edit template" : "Create template"}</h2>
            <p className="section-copy">Categorized templates now feed the lead-detail composer palette.</p>

            {generated ? <div className="empty">New draft created. Review it below and adjust if needed.</div> : null}
            {deleted ? <div className="empty">Template deleted.</div> : null}
            {deleteError ? (
              <div className="empty">This template is still used by a sequence step. Assign a different template first.</div>
            ) : null}

            <form action={saveTemplateAction} className="form-grid">
              <input type="hidden" name="templateId" value={selectedTemplate?.id ?? ""} />
              <input className="input" name="name" placeholder="Template name" defaultValue={selectedTemplate?.name ?? ""} required />
              <select className="select" name="category" defaultValue={selectedTemplate?.category ?? "MANUAL"}>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input className="input" name="subject" placeholder="Subject" defaultValue={selectedTemplate?.subject ?? ""} required />
              <textarea
                className="textarea"
                name="bodyText"
                placeholder="Plain-text body"
                defaultValue={selectedTemplate?.bodyText ?? ""}
                required
              />
              <div className="button-row">
                <button className="button" type="submit">
                  {selectedTemplate ? "Save changes" : "Create template"}
                </button>
              </div>
            </form>

            {selectedTemplate ? (
              <form action={deleteTemplateAction} style={{ marginTop: 16 }}>
                <input type="hidden" name="templateId" value={selectedTemplate.id} />
                <button className="button danger" type="submit">
                  Delete template
                </button>
              </form>
            ) : null}
          </section>
        </div>
      </section>
    </>
  );
}
