import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function AdminLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const [adminName, setAdminName] = useState('관리자')
    const [analysisOpen, setAnalysisOpen] = useState(false)

    useEffect(() => {
        try {
            const session = JSON.parse(localStorage.getItem('admin_session'))
            if (session?.name) setAdminName(session.name)
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
                    <div className="admin-topbar-logo">🥊</div>
                    <span className="admin-topbar-title">바디복싱짐 관리자</span>
                </div>
                <div className="admin-topbar-right">
                    <div className="admin-topbar-search">
                        <span className="admin-topbar-search-icon">🔍</span>
                        <input type="text" placeholder="통합 검색..." readOnly />
                    </div>
                    <button className="admin-topbar-icon-btn" title="알림">🔔</button>
                    <button className="admin-topbar-icon-btn" title="설정">⚙️</button>
                    <div className="admin-topbar-avatar" title={adminName}>
                        {adminName.charAt(0)}
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
                            <span className="admin-sidebar-icon">📊</span>
                            <span>대시보드</span>
                        </NavLink>
                        <NavLink
                            to="/admin/members"
                            className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="admin-sidebar-icon">👥</span>
                            <span>회원 관리</span>
                        </NavLink>
                        <NavLink
                            to="/admin/payments"
                            className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="admin-sidebar-icon">💰</span>
                            <span>매출/결제</span>
                        </NavLink>

                        {/* 분석 메뉴 (토글) */}
                        <div className="admin-sidebar-group">
                            <button
                                className={`admin-sidebar-item ${location.pathname.startsWith('/admin/analysis') ? 'active' : ''}`}
                                onClick={() => setAnalysisOpen(!analysisOpen)}
                            >
                                <span className="admin-sidebar-icon">📈</span>
                                <span>분석</span>
                                <span className={`admin-sidebar-chevron ${analysisOpen ? 'open' : ''}`}>▾</span>
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
                            <span className="admin-sidebar-icon">⚙️</span>
                            <span>설정</span>
                        </button>
                        <button className="admin-sidebar-item" onClick={handleLogout}>
                            <span className="admin-sidebar-icon">🚪</span>
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
