import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import "./Layout.css";

export function Layout() {
  const { isAuthenticated, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="brand" end>
          Synk
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/about">About</NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <button type="button" className="linkish" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/login">Sign in</NavLink>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
