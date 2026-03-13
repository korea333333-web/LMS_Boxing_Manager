import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
    const adminSession = localStorage.getItem('admin_session')

    if (!adminSession) {
        return <Navigate to="/admin/login" replace />
    }

    try {
        const session = JSON.parse(adminSession)
        if (!session.id || !session.username) {
            localStorage.removeItem('admin_session')
            return <Navigate to="/admin/login" replace />
        }
    } catch {
        localStorage.removeItem('admin_session')
        return <Navigate to="/admin/login" replace />
    }

    return children
}
