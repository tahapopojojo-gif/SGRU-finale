import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider, ToastContext } from './context/ToastContext.jsx'
import Toast from './components/Toast.jsx'
import { useContext } from 'react'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import MapPage from './pages/MapPage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import UrbanisteDashboard from './pages/UrbanisteDashboard.jsx'
import SuperAdminPage from './pages/SuperAdminPage.jsx'
import NotFound from './pages/NotFound.jsx'
import ProtectedRoute, { getRoleDashboard } from './components/ProtectedRoute.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext)
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000 }}>
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

// Redirects each role to their correct home page
function RoleRedirect() {
  const { user, token } = useAuth()
  if (!token) return <Navigate to="/login" />
  return <Navigate to={getRoleDashboard(user?.role)} />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root: smart redirect based on role */}
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/registre" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* /map is ONLY for citizens */}
      <Route path="/map" element={
        <ProtectedRoute roles={['citoyen']}>
          <MapPage />
        </ProtectedRoute>
      } />

      <Route path="/admin/dashboard" element={
        <ProtectedRoute roles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/urbaniste/dashboard" element={
        <ProtectedRoute roles={['urbaniste', 'admin']}>
          <UrbanisteDashboard />
        </ProtectedRoute>
      } />

      <Route path="/super-admin/users" element={
        <ProtectedRoute roles={['super_admin']}>
          <SuperAdminPage />
        </ProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
            <ToastContainer />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </ToastProvider>
  )
}

export default App