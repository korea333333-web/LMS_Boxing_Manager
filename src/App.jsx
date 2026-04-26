import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './admin/pages/AdminLogin'
import AdminLayout from './admin/components/AdminLayout'
import ProtectedRoute from './admin/components/ProtectedRoute'
import Dashboard from './admin/pages/Dashboard'
import MemberManagement from './admin/pages/MemberManagement'
import Statistics from './admin/pages/Statistics'
import MemberRegister from './admin/pages/MemberRegister'
import AnalysisAgeStats from './admin/pages/AnalysisAgeStats'
import AnalysisAttendance from './admin/pages/AnalysisAttendance'
import AnalysisDemographics from './admin/pages/AnalysisDemographics'
import AnalysisMembersTrend from './admin/pages/AnalysisMembersTrend'
import PaymentManagement from './admin/pages/PaymentManagement'
import LessonJournal from './admin/pages/LessonJournal'
import NoticeManagement from './admin/pages/NoticeManagement'
import MemberApp from './member/MemberApp'
import PrivacyPolicy from './legal/PrivacyPolicy'
import TermsOfService from './legal/TermsOfService'
import ConsentForm from './legal/ConsentForm'
import MonitorDisplay from './admin/pages/MonitorDisplay'
import Settings from './admin/pages/Settings'

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
                <Route path="payments" element={<PaymentManagement />} />
                <Route path="lessons" element={<LessonJournal />} />
                <Route path="notices" element={<NoticeManagement />} />
                <Route path="stats" element={<Statistics />} />
                <Route path="settings" element={<Settings />} />
                <Route path="analysis/age-stats" element={<AnalysisAgeStats />} />
                <Route path="analysis/attendance" element={<AnalysisAttendance />} />
                <Route path="analysis/demographics" element={<AnalysisDemographics />} />
                <Route path="analysis/members-trend" element={<AnalysisMembersTrend />} />
            </Route>
            {/* 회원용 페이지 */}
            <Route path="/member" element={<MemberApp />} />
            {/* 정책 페이지 (공개) */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/consent-form" element={<ConsentForm />} />
            {/* 모니터 디스플레이 (체육관 TV용) - 별도 풀스크린 라우트 */}
            <Route path="/monitor" element={<MonitorDisplay />} />
            {/* 루트 접속 시 관리자 로그인으로 리다이렉트 */}
            <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
    )
}
