import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './admin/pages/AdminLogin'
import AdminLayout from './admin/components/AdminLayout'
import ProtectedRoute from './admin/components/ProtectedRoute'
import Dashboard from './admin/pages/Dashboard'
import MemberManagement from './admin/pages/MemberManagement'
import Statistics from './admin/pages/Statistics'
import MemberRegister from './admin/pages/MemberRegister'

export default function App() {
    return (
        <Routes>
            {/* 관리자 라우트 */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="members" element={<MemberManagement />} />
                <Route path="members/register" element={<MemberRegister />} />
                <Route path="stats" element={<Statistics />} />
            </Route>
            {/* 루트 접속 시 관리자 로그인으로 리다이렉트 */}
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
    )
}
