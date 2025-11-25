import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import SiteDetailPage from './pages/SiteDetailPage';
import RunDetailPage from './pages/RunDetailPage';
import IssuesPage from './pages/IssuesPage';
import BaselinesPage from './pages/BaselinesPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/projects" replace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sites/:id"
            element={
              <ProtectedRoute>
                <SiteDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/runs/:id"
            element={
              <ProtectedRoute>
                <RunDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sites/:siteId/baselines"
            element={
              <ProtectedRoute>
                <BaselinesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/issues"
            element={
              <ProtectedRoute>
                <IssuesPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
