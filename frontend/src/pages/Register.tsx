import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { pb } from "../lib/pocketbase";

export function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      await pb.collection("users").create({
        email,
        password,
        passwordConfirm,
      });
      await pb.collection("users").authWithPassword(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not create account";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="stack-lg">
      <div className="page-header">
        <div>
          <p className="eyebrow">Authentication</p>
          <h1>Create your account</h1>
          <p className="page-description">
            Register with email and password. You will be signed in and taken to
            the dashboard.
          </p>
        </div>
      </div>
      <p className="muted">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
      <form className="stack form" onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </section>
  );
}
