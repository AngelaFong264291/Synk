import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ActiveWorkspaceProvider } from "./lib/ActiveWorkspaceProvider";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { About } from "./pages/About";
import { DocumentDetail } from "./pages/DocumentDetail";
import { Documents } from "./pages/Documents";
import { Dashboard } from "./pages/Dashboard";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { NotFound } from "./pages/NotFound";
import { Register } from "./pages/Register";
import { Tasks } from "./pages/Tasks";
import { Workspace } from "./pages/Workspace";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ActiveWorkspaceProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="workspace"
                element={
                  <ProtectedRoute>
                    <Workspace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="team"
                element={<Navigate to="/workspace" replace />}
              />
              <Route
                path="documents"
                element={
                  <ProtectedRoute>
                    <Documents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="documents/:documentId"
                element={
                  <ProtectedRoute>
                    <DocumentDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tasks"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ActiveWorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
