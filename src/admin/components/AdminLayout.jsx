import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function AdminLayout() {
    const navigate = useNavigate()
    const [adminName, setAdminName] = useState('관리자')

    useEffect(() => {
        try {
            const session = JSON.parse(localStorage.getItem('admin_session'))
            if (session?.name) setAdminName(session.name)
        } catch { }
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('admin_session')
        navigate('/admin/login', { replace: true })
    }

    const menuItems = [
        { path: '/admin/dashboard', label: '대시보드', icon: '📊' },
        { path: '/admin/members', label: '회원 관리', icon: '👥' },
        { path: '/admin/stats', label: '통계', icon: '📈' },
    ]

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
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `admin-sidebar-item ${isActive ? 'active' : ''}`
                                }
                            >
                                <span className="admin-sidebar-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
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
