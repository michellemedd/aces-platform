import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Entrepreneurs from './pages/Entrepreneurs';
import EntrepreneurDetail from './pages/EntrepreneurDetail';
import LabCalls from './pages/LabCalls';
import Masterminds from './pages/Masterminds';
import MastermindDetail from './pages/MastermindDetail';
import Team from './pages/Team';
import Reports from './pages/Reports';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--gold)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function RequireAdmin({ children }) {
  const { user, isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/entrepreneurs" element={<RequireAuth><Entrepreneurs /></RequireAuth>} />
          <Route path="/entrepreneurs/:id" element={<RequireAuth><EntrepreneurDetail /></RequireAuth>} />
          <Route path="/lab-calls" element={<RequireAuth><LabCalls /></RequireAuth>} />
          <Route path="/masterminds" element={<RequireAuth><Masterminds /></RequireAuth>} />
          <Route path="/masterminds/:id" element={<RequireAuth><MastermindDetail /></RequireAuth>} />
          <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
          <Route path="/team" element={<RequireAuth><RequireAdmin><Team /></RequireAdmin></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
