import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="stack">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </section>
  );
}
