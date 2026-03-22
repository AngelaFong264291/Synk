export function About() {
  return (
    <section className="stack-xl marketing-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="eyebrow">About Synk</p>
          <h1>A sharper workspace for teams that need clarity, not overhead.</h1>
          <p className="marketing-copy">
            Synk is designed for teams who move quickly but still need
            structure. It brings together workspace setup, document history, and
            task ownership in one clean environment so collaboration feels more
            professional and less chaotic.
          </p>
        </div>
        <div className="about-highlight-card">
          <span className="about-highlight-label">Built for</span>
          <strong>Product teams, founders, operators, and cross-functional collaborators</strong>
          <p>
            The people who need alignment and accountability without adopting a
            giant enterprise workflow.
          </p>
        </div>
      </section>

      <section className="about-grid">
        <article className="about-card">
          <p className="eyebrow">What Synk solves</p>
          <h2>Too much context is scattered across too many places</h2>
          <p>
            Teams lose time when task status lives in one tool, docs live in
            another, and workspace coordination happens in chat. Synk reduces
            that fragmentation by making the current state visible in one place.
          </p>
        </article>

        <article className="about-card">
          <p className="eyebrow">How it works</p>
          <h2>A simple loop your team can actually keep using</h2>
          <div className="about-steps">
            <div className="about-step">
              <span>01</span>
              <p>Create or join a workspace and align the team around one shared space.</p>
            </div>
            <div className="about-step">
              <span>02</span>
              <p>Capture document progress and preserve useful snapshot history.</p>
            </div>
            <div className="about-step">
              <span>03</span>
              <p>Assign and track tasks so execution stays visible and accountable.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="about-checklist-card">
        <div className="about-checklist-copy">
          <p className="eyebrow">Current product scope</p>
          <h2>What users get in this version</h2>
          <p>
            The current MVP is focused on the core collaboration loop that
            users can understand quickly and return to often.
          </p>
        </div>
        <ul className="about-feature-list">
          <li>Email sign-in with a protected workspace experience</li>
          <li>Workspace creation, switching, and invite-code onboarding</li>
          <li>Documents with snapshot history and clearer context retention</li>
          <li>Task tracking with ownership, status, and delivery visibility</li>
        </ul>
      </section>
    </section>
  );
}
