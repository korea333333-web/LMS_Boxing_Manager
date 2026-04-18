import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Dumbbell, LayoutDashboard, Users, CreditCard, BarChart3, ChevronDown, Settings, LogOut, Search, Bell, CalendarDays } from 'lucide-react'

export default function AdminLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const [adminName, setAdminName] = useState('관리자')
    const [adminRole, setAdminRole] = useState('관리자')
    const [analysisOpen, setAnalysisOpen] = useState(false)

    const today = new Date()
    const dateStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

    useEffect(() => {
        try {
            const session = JSON.parse(localStorage.getItem('admin_session'))
            if (session?.name) setAdminName(session.name)
            if (session?.role) setAdminRole(session.role === 'owner' ? '오너' : '코치')
        } catch { }
    }, [])

    // 분석 하위 메뉴가 활성화되면 자동으로 펼치기
    useEffect(() => {
        if (location.pathname.startsWith('/admin/analysis')) {
            setAnalysisOpen(true)
        }
    }, [location.pathname])

    const handleLogout = () => {
        localStorage.removeItem('admin_session')
        navigate('/admin/login', { replace: true })
    }

    return (
        <div className="admin-layout">
            {/* 탑바 */}
            <header className="admin-topbar">
                <div className="admin-topbar-left">
                    <div className="admin-topbar-logo"><Dumbbell size={22} /></div>
                    <span className="admin-topbar-title">바디복싱짐 관리자</span>
                </div>
                <div className="admin-topbar-right">
                    <div className="admin-topbar-search">
                        <span className="admin-topbar-search-icon"><Search size={16} /></span>
                        <input type="text" placeholder="통합 검색..." readOnly />
                    </div>
                    <div className="admin-topbar-date">
                        <CalendarDays size={14} />
                        {dateStr}
                    </div>
                    <button className="admin-topbar-icon-btn" title="알림">
                        <Bell size={18} />
                        <span className="notification-dot" />
                    </button>
                    <button className="admin-topbar-icon-btn" title="설정"><Settings size={18} /></button>
                    <div className="admin-topbar-profile">
                        <div className="admin-topbar-avatar" title={adminName}>
                            {adminName.charAt(0)}
                        </div>
                        <div className="admin-topbar-profile-info">
                            <span className="admin-topbar-profile-name">{adminName}</span>
                            <span className="admin-topbar-profile-role">{adminRole}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="admin-body">
                {/* 사이드바 */}
                <aside className="admin-sidebar">
                    <nav className="admin-sidebar-nav">
                        <NavLink
                            to="/admin/dashboard"
                            className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="admin-sidebar-icon"><LayoutDashboard size={18} /></span>
                            <span>대시보드</span>
                        </NavLink>
                        <NavLink
                            to="/admin/members"
                            className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="admin-sidebar-icon"><Users size={18} /></span>
                            <span>회원 관리</span>
                        </NavLink>
                        <NavLink
                            to="/admin/payments"
                            className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="admin-sidebar-icon"><CreditCard size={18} /></span>
                            <span>매출/결제</span>
                        </NavLink>
                        <NavLink
                            to="/admin/lessons"
                            className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="admin-sidebar-icon">📋</span>
                            <span>수업일지</span>
                        </NavLink>
                        <NavLink
                            to="/admin/notices"
                            className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="admin-sidebar-icon">📢</span>
                            <span>공지/메시지</span>
                        </NavLink>
                        <button
                            className="admin-sidebar-item"
                            onClick={() => window.open('/monitor', '_blank', 'fullscreen=yes')}
                            title="새 창에서 모니터 화면 열기 (체육관 TV용)"
                        >
                            <span className="admin-sidebar-icon">📺</span>
                            <span>모니터 화면 열기</span>
                        </button>

                        {/* 분석 메뉴 (토글) */}
                        <div className="admin-sidebar-group">
                            <button
                                className={`admin-sidebar-item ${location.pathname.startsWith('/admin/analysis') ? 'active' : ''}`}
                                onClick={() => setAnalysisOpen(!analysisOpen)}
                            >
                                <span className="admin-sidebar-icon"><BarChart3 size={18} /></span>
                                <span>분석</span>
                                <span className={`admin-sidebar-chevron ${analysisOpen ? 'open' : ''}`}><ChevronDown size={14} /></span>
                            </button>
                            {analysisOpen && (
                                <div className="admin-sidebar-submenu">
                                    <NavLink
                                        to="/admin/analysis/age-stats"
                                        className={({ isActive }) => `admin-sidebar-subitem ${isActive ? 'active' : ''}`}
                                    >
                                        연령별 현황
                                    </NavLink>
                                    <NavLink
                                        to="/admin/analysis/attendance"
                                        className={({ isActive }) => `admin-sidebar-subitem ${isActive ? 'active' : ''}`}
                                    >
                                        출석 분석
                                    </NavLink>
                                    <NavLink
                                        to="/admin/analysis/demographics"
                                        className={({ isActive }) => `admin-sidebar-subitem ${isActive ? 'active' : ''}`}
                                    >
                                        연령 및 출석
                                    </NavLink>
                                </div>
                            )}
                        </div>
                    </nav>

                    <div className="admin-sidebar-bottom">
                        <button className="admin-sidebar-item">
                            <span className="admin-sidebar-icon"><Settings size={18} /></span>
                            <span>설정</span>
                        </button>
                        <button className="admin-sidebar-item" onClick={handleLogout}>
                            <span className="admin-sidebar-icon"><LogOut size={18} /></span>
                            <span>로그아웃</span>
                        </button>
                    </div>
                </aside>

                {/* 메인 콘텐츠 */}
                <main className="admin-main">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
