import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useActiveWorkspace } from "../lib/useActiveWorkspace";
import synkLogo from "../assets/Synk Logo.png";
import "./Layout.css";

export function Layout() {
  const { isAuthenticated, model, signOut } = useAuth();
  const {
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    workspaces,
  } = useActiveWorkspace();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!workspaceMenuOpen) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!workspaceMenuRef.current?.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setWorkspaceMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [workspaceMenuOpen]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <NavLink to="/" className="brand" end>
            <img
              src={synkLogo}
              alt="Synk"
              className="brand-mark"
            />
          </NavLink>
          <nav className="nav">
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/workspace">Workspaces</NavLink>
                <NavLink to="/documents">Documents</NavLink>
                <NavLink to="/tasks">Tasks</NavLink>
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
              {workspaces.length ? (
                <div ref={workspaceMenuRef} className="workspace-menu">
                  <button
                    type="button"
                    className="workspace-chip workspace-chip-button"
                    onClick={() => setWorkspaceMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={workspaceMenuOpen}
                  >
                    <span className="workspace-chip-label">
                      Active workspace
                    </span>
                    <span className="workspace-chip-current">
                      <strong>
                        {activeWorkspace?.name ?? "Choose workspace"}
                      </strong>
                      <span className="workspace-chip-caret">▾</span>
                    </span>
                  </button>
                  {workspaceMenuOpen ? (
                    <div className="workspace-menu-popover" role="menu">
                      {workspaces.map((workspace) => {
                        const isActive = workspace.id === activeWorkspaceId;

                        return (
                          <button
                            key={workspace.id}
                            type="button"
                            className={`workspace-menu-item${isActive ? " workspace-menu-item-active" : ""}`}
                            onClick={() => {
                              setActiveWorkspaceId(workspace.id);
                              setWorkspaceMenuOpen(false);
                            }}
                            role="menuitemradio"
                            aria-checked={isActive}
                          >
                            <span className="workspace-menu-item-title">
                              {workspace.name}
                            </span>
                            {isActive ? (
                              <span className="workspace-menu-check">✓</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : activeWorkspace ? (
                <div className="workspace-chip">
                  <span className="workspace-chip-label">Active workspace</span>
                  <strong>{activeWorkspace.name}</strong>
                </div>
              ) : null}
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
