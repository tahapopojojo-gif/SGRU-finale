import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Returns the correct home page for each role
export function getRoleDashboard(role) {
  if (role === 'admin')       return '/admin/dashboard';
  if (role === 'urbaniste')   return '/urbaniste/dashboard';
  if (role === 'super_admin') return '/super-admin/users';
  return '/account'; // citoyen
}

const ProtectedRoute = ({ children, roles = [] }) => {
    const { user, token } = useAuth()

    if (!token) {
        return <Navigate to="/login" />
    }

    if (roles.length > 0 && (!user || !roles.includes(user.role))) {
        // Redirect to the correct dashboard instead of always to /map
        return <Navigate to={getRoleDashboard(user?.role)} />
    }

    return children
}

export default ProtectedRoute