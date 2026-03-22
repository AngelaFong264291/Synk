import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import "./Layout.css";

export function Layout() {
  const { isAuthenticated, model, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <NavLink to="/" className="brand" end>
            <span className="brand-mark">S</span>
            <span>
              Synk
              <small>Hackathon MVP</small>
            </span>
          </NavLink>
          <nav className="nav">
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/workspace">Workspaces</NavLink>
                <NavLink to="/documents">Documents</NavLink>
                <NavLink to="/tasks">Tasks</NavLink>
                <NavLink to="/decisions">Decisions</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" end>
                  Home
                </NavLink>
                <NavLink to="/about">About</NavLink>
              </>
            )}
          </nav>
        </div>
        <div className="header-right">
          {isAuthenticated ? (
            <>
              <div className="user-chip">
                <span className="user-chip-dot" />
                <span>{model?.email ?? "Signed in"}</span>
              </div>
              <button
                type="button"
                className="button-link button-link-secondary header-sign-out"
                onClick={signOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/register"
                className="button-link button-link-secondary"
              >
                Sign up
              </NavLink>
              <NavLink to="/login" className="button-link">
                Sign in
              </NavLink>
            </>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
