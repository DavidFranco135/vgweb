import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { auth } from './lib/firebase';
import { ClientLayout, AdminLayout } from './components/Layouts';
import { LoginPage } from './pages/Login';
import { ClientHome } from './pages/ClientHome';
import { FinancePage } from './pages/Finance';
import { SupportPage } from './pages/Support';
import { ProfilePage } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminClients } from './pages/admin/AdminClients';
import { AdminInvoices } from './pages/admin/AdminInvoices';
import { AdminTickets } from './pages/admin/AdminTickets';
import { AdminPlans } from './pages/admin/AdminPlans';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminNotificacoes } from './pages/admin/AdminNotificacoes';
import { PlansPage } from './pages/Plans';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: 'client' | 'admin' }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Perfil não encontrado</h2>
        <p className="text-slate-500 mb-6">Não conseguimos carregar seus dados. Tente sair e entrar novamente.</p>
        <button
          onClick={() => auth.signOut()}
          className="px-6 py-2 bg-primary text-white rounded-xl font-medium"
        >
          Sair do Sistema
        </button>
      </div>
    );
  }

  if (role && profile.tipo !== role) {
    return <Navigate to={profile.tipo === 'admin' ? '/admin' : '/'} />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* ── Rotas do Cliente ── */}
          <Route path="/" element={
            <ProtectedRoute role="client">
              <ClientLayout><ClientHome /></ClientLayout>
            </ProtectedRoute>
          } />
          <Route path="/finance" element={
            <ProtectedRoute role="client">
              <ClientLayout><FinancePage /></ClientLayout>
            </ProtectedRoute>
          } />
          <Route path="/support" element={
            <ProtectedRoute role="client">
              <ClientLayout><SupportPage /></ClientLayout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute role="client">
              <ClientLayout><ProfilePage /></ClientLayout>
            </ProtectedRoute>
          } />
          <Route path="/plans" element={
            <ProtectedRoute role="client">
              <ClientLayout><PlansPage /></ClientLayout>
            </ProtectedRoute>
          } />

          {/* ── Rotas do Admin ── */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <AdminLayout><AdminDashboard /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/clients" element={
            <ProtectedRoute role="admin">
              <AdminLayout><AdminClients /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/invoices" element={
            <ProtectedRoute role="admin">
              <AdminLayout><AdminInvoices /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/tickets" element={
            <ProtectedRoute role="admin">
              <AdminLayout><AdminTickets /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/plans" element={
            <ProtectedRoute role="admin">
              <AdminLayout><AdminPlans /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute role="admin">
              <AdminLayout><AdminSettings /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/notificacoes" element={
            <ProtectedRoute role="admin">
              <AdminLayout><AdminNotificacoes /></AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
