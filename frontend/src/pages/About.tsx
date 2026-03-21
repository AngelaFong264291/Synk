export function About() {
  return (
    <section className="stack-lg">
      <h1>About Synk</h1>
      <p>
        Synk is a collaboration workspace for teams who need lightweight
        accountability without developer-only tooling. This frontend focuses on
        the hackathon MVP: workspaces, documents, snapshots, tasks, and
        decisions.
      </p>
      <div className="panel">
        <h2>MVP checklist</h2>
        <ul className="checklist">
          <li>Email sign-in and protected dashboard</li>
          <li>Workspace overview and invite code</li>
          <li>Documents with named snapshot history</li>
          <li>Task board with ownership and status</li>
          <li>Decision log for project alignment</li>
        </ul>
      </div>
    </section>
  );
}
