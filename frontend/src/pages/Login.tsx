import { useState, type SubmitEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from "react-router-dom";
import {
  normalizeAuthEmail,
  pb,
  pocketBaseErrorMessage,
} from "../lib/pocketbase";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: Location } | null | undefined;
  const from = state?.from?.pathname ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await pb
        .collection("users")
        .authWithPassword(normalizeAuthEmail(email), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(pocketBaseErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="stack-lg">
      <div className="page-header">
        <div>
          <p className="eyebrow">Authentication</p>
          <h1>Sign in to your workspace</h1>
          <p className="page-description">
            Use your PocketBase user account to open the hackathon dashboard and
            continue the shared demo flow.
          </p>
        </div>
      </div>
      <p className="muted">
        New here? <Link to="/register">Create an account</Link> — or sign in
        below.
      </p>
      <form className="stack form" onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
