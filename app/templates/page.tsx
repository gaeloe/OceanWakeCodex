export const dynamic = "force-dynamic";
export const revalidate = 0;

import { deleteTemplateAction, saveTemplateAction } from "@/app/actions";
import { prisma } from "@/lib/db";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: { template?: string } | Promise<{ template?: string }>;
}) {
  const resolved = await Promise.resolve(searchParams);
  const templates = await prisma.template.findMany({ orderBy: { updatedAt: "desc" } });
  const selectedTemplate = templates.find((template) => template.id === resolved?.template) ?? templates[0] ?? null;

  return (
    <>
      <section className="panel hero">
        <div>
          <p className="brand-eyebrow" style={{ color: "var(--accent)" }}>
            Message Library
          </p>
          <h1>Templates</h1>
          <p className="section-copy">
            Maintain the sequence library and adjust outbound copy without touching raw JSON or SQL.
          </p>
        </div>
        <div className="pill">{templates.length} templates</div>
      </section>

      <section className="detail-grid">
        <section className="panel pad">
          <div className="toolbar">
            <div>
              <h2 className="section-title">Template list</h2>
              <p className="section-copy">Pick a template to edit, or start a new one.</p>
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

        <section className="panel pad">
          <h2 className="section-title">{selectedTemplate ? "Edit template" : "Create template"}</h2>
          <p className="section-copy">Default cadence remains immediate, +1d, +3d, +7d, +14d.</p>

          <form action={saveTemplateAction} className="form-grid">
            <input type="hidden" name="templateId" value={selectedTemplate?.id ?? ""} />
            <input className="input" name="name" placeholder="Template name" defaultValue={selectedTemplate?.name ?? ""} required />
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
      </section>
    </>
  );
}
