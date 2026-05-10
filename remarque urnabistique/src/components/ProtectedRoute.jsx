import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, roles = [] }) => {
    const { user, token, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                color: '#fff', fontSize: '18px', fontWeight: 600
            }}>
                ⏳ Chargement...
            </div>
        )
    }

    if (!token) {
        return <Navigate to="/login" replace />
    }

    if (roles.length > 0 && (!user || !roles.includes(user.role))) {
        return <Navigate to="/map" replace />
    }

    return children
}

export default ProtectedRoute