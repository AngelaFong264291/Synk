import { useAuth } from "../auth/useAuth";

export function Dashboard() {
  const { model } = useAuth();

  return (
    <section className="stack">
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{model?.email ?? model?.id}</strong>
      </p>
      <p className="muted">
        Fetch collections with <code>pb.collection(&apos;…&apos;)</code> and
        subscribe to changes with the PocketBase client.
      </p>
    </section>
  );
}
