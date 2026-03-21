import { PageHeader } from "../components/PageHeader";
import { decisions } from "../lib/demo-data";

export function Decisions() {
  return (
    <section className="stack-lg">
      <PageHeader
        eyebrow="Decision log"
        title="Capture what changed and why"
        description="This is the audit trail you can demo when judges ask how the team stays aligned."
        actions={<button type="button">Log decision</button>}
      />

      <div className="panel-list">
        {decisions.map((decision) => (
          <article key={decision.id} className="panel">
            <div className="row space-between wrap gap-sm">
              <div>
                <h2>{decision.title}</h2>
                <p>{decision.context}</p>
              </div>
              <div className="align-right">
                <p className="muted">{decision.date}</p>
                <p className="muted">{decision.owner}</p>
              </div>
            </div>
            <div className="decision-outcome">
              <strong>Decision</strong>
              <p>{decision.outcome}</p>
            </div>
            <p className="muted">Linked to: {decision.linkedTo}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
