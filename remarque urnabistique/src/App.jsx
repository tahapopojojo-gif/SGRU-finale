import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
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
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext)

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000 }}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/map" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/registre" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/map" element={
                <ProtectedRoute>
                  <MapPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute roles={['admin', 'super_admin']}>
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
            <ToastContainer />
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </ToastProvider>
  )
}

export default App