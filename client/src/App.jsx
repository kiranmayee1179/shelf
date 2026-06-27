import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Batches from './pages/Batches';
import Alerts from './pages/Alerts';
import BatchDetail from './pages/BatchDetail';
import PreservedFoods from './pages/PreservedFoods';
import ProductDetail from './pages/ProductDetail';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import ErrorBoundary from './components/ErrorBoundary';

// Route guard for authenticated users
const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Synchronizing user session...</p>
      </div>
    );
  }

  return token ? children : <Navigate to="/login" replace />;
};

// Layout for private dashboard pages
const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  return (
    <div className={`app-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-wrapper">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="content-body">
          {children}
        </main>
      </div>
      <Chatbot />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </PrivateRoute>
          } />
          
          <Route path="/batches" element={
            <PrivateRoute>
              <DashboardLayout>
                <Batches />
              </DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/batches/:id" element={
            <PrivateRoute>
              <DashboardLayout>
                <BatchDetail />
              </DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/preserved-foods" element={
            <PrivateRoute>
              <DashboardLayout>
                <PreservedFoods />
              </DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/preserved-foods/product/:productName" element={
            <PrivateRoute>
              <DashboardLayout>
                <ProductDetail />
              </DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/alerts" element={
            <PrivateRoute>
              <DashboardLayout>
                <Alerts />
              </DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/settings" element={
            <PrivateRoute>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/reports" element={
            <PrivateRoute>
              <DashboardLayout>
                <Reports />
              </DashboardLayout>
            </PrivateRoute>
          } />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
     </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
