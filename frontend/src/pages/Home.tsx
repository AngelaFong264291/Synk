import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { members, tasks, workspace } from "../lib/demo-data";

export function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="stack-xl marketing-page">
      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="eyebrow">Collaboration clarity for fast-moving teams</p>
          <h1>Keep docs, ownership, and momentum in one polished workspace.</h1>
          <p className="marketing-copy">
            Synk helps product, design, and execution stay aligned without
            forcing your team into heavyweight project software. Everyone sees
            what changed, who owns it, and what happens next.
          </p>
          <div className="marketing-actions">
            <Link
              className="button-link"
              to={isAuthenticated ? "/dashboard" : "/register"}
            >
              Start with Synk
            </Link>
            <Link className="button-link button-link-secondary" to="/about">
              Why teams choose it
            </Link>
          </div>
          <div className="marketing-proof-row">
            <div className="marketing-proof-chip">
              <strong>{members.length} collaborators</strong>
              <span>working from one shared source of truth</span>
            </div>
            <div className="marketing-proof-chip">
              <strong>{tasks.length} active tasks</strong>
              <span>visible with ownership and momentum</span>
            </div>
          </div>
        </div>

        <aside className="marketing-hero-card">
          <div className="marketing-hero-card-top">
            <p className="eyebrow">Live workspace</p>
            <span className="marketing-live-pill">In motion</span>
          </div>
          <h2>{workspace.name}</h2>
          <p className="marketing-hero-card-text">{workspace.milestone}</p>
          <div className="marketing-card-stat-grid">
            <article>
              <strong>{members.length}</strong>
              <span>members aligned</span>
            </article>
            <article>
              <strong>{tasks.length}</strong>
              <span>tasks actively tracked</span>
            </article>
            <article>
              <strong>{workspace.inviteCode}</strong>
              <span>invite code ready</span>
            </article>
          </div>
          <div className="marketing-hero-card-rail">
            <div className="marketing-rail-item">
              <span className="marketing-rail-dot" />
              <div>
                <strong>Shared document history</strong>
                <p>Keep progress anchored to the latest working context.</p>
              </div>
            </div>
            <div className="marketing-rail-item">
              <span className="marketing-rail-dot marketing-rail-dot-alt" />
              <div>
                <strong>Cleaner handoffs</strong>
                <p>Let the next owner pick up work without guessing.</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="marketing-value-grid">
        <article className="marketing-value-card">
          <p className="eyebrow">Visibility</p>
          <h2>See the current state instantly</h2>
          <p>
            Documents, workspace activity, and task status are grouped together
            so your team can orient quickly without opening five tools.
          </p>
        </article>
        <article className="marketing-value-card">
          <p className="eyebrow">Ownership</p>
          <h2>Make accountability lightweight</h2>
          <p>
            Assign work, watch progress move, and keep delivery visible without
            turning your process into bureaucracy.
          </p>
        </article>
        <article className="marketing-value-card">
          <p className="eyebrow">Momentum</p>
          <h2>Reduce the drag between idea and execution</h2>
          <p>
            Synk gives teams one place to coordinate next steps, keep docs
            current, and move work forward with confidence.
          </p>
        </article>
      </section>
    </section>
  );
}
