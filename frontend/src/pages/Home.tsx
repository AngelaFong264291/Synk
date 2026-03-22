import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { members, tasks, workspace } from "../lib/demo-data";

export function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="stack-xl">
      <div className="landing-hero">
        <div className="stack">
          <p className="eyebrow">Hackathon collaboration OS</p>
          <h1>
            Synk gives your team one place to track changes, ownership, and
            decisions.
          </h1>
          <p className="hero-copy">
            Build the demo around a single shared workspace instead of chasing
            updates across docs, chats, and task lists.
          </p>
          <div className="row gap-sm wrap">
            <Link className="button-link" to={isAuthenticated ? "/dashboard" : "/login"}>
              Open workspace
            </Link>
            <Link className="button-link button-link-secondary" to="/about">
              See MVP scope
            </Link>
          </div>
        </div>

        <aside className="hero-side panel">
          <p className="eyebrow">Live demo frame</p>
          <h2>{workspace.name}</h2>
          <p>{workspace.milestone}</p>
          <div className="meta-grid">
            <span>{members.length} teammates</span>
            <span>{tasks.length} active tasks</span>
            <span>Invite code {workspace.inviteCode}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
