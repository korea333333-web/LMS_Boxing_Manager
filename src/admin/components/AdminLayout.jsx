import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
    Dumbbell, LayoutDashboard, Users, CreditCard, BarChart3,
    ChevronDown, Settings, LogOut, Bell, CalendarDays,
    BookOpen, Megaphone, Tv, Key, ChevronLeft, ChevronRight,
    UserCircle2, AlertTriangle, UserPlus, Wallet, Sparkles, RotateCcw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const [adminName, setAdminName] = useState('관리자')
    const [adminRole, setAdminRole] = useState('관리자')
    const [analysisOpen, setAnalysisOpen] = useState(false)

    // 드롭다운 상태
    const [datePopover, setDatePopover] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)

    // 선택된 날짜 (전체 페이지에서 사용 가능하게 추후 Context로 확장)
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [calMonth, setCalMonth] = useState(new Date())

    // 알림
    const [notifications, setNotifications] = useState([])
    const [notifLoading, setNotifLoading] = useState(true)

    const dateRef = useRef(null)
    const notifRef = useRef(null)
    const profileRef = useRef(null)

    useEffect(() => {
        try {
            const session = JSON.parse(localStorage.getItem('admin_session'))
            if (session?.name) setAdminName(session.name)
            if (session?.role) setAdminRole(session.role === 'owner' ? '오너' : '코치')
        } catch { }
    }, [])

    useEffect(() => {
        if (location.pathname.startsWith('/admin/analysis')) setAnalysisOpen(true)
    }, [location.pathname])

    // 외부 클릭으로 드롭다운 닫기
    useEffect(() => {
        function handleClickOutside(e) {
            if (datePopover && dateRef.current && !dateRef.current.contains(e.target)) setDatePopover(false)
            if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
            if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [datePopover, notifOpen, profileOpen])

    // 알림 데이터 가져오기
    useEffect(() => {
        if (notifOpen) fetchNotifications()
    }, [notifOpen])

    async function fetchNotifications() {
        setNotifLoading(true)
        try {
            const items = []
            const now = new Date()
            const sevenDaysLater = new Date(now.getTime() + 7 * 86400000)
            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            // 만료 임박 회원권 (7일 이내)
            const { data: expiringMemberships } = await supabase
                .from('memberships')
                .select('*, members(name)')
                .gte('end_date', now.toISOString().split('T')[0])
                .lte('end_date', sevenDaysLater.toISOString().split('T')[0])
                .order('end_date', { ascending: true })
                .limit(10)

            expiringMemberships?.forEach(m => {
                const daysLeft = Math.ceil((new Date(m.end_date) - now) / (1000 * 60 * 60 * 24))
                items.push({
                    id: `exp-${m.id}`,
                    type: 'warning',
                    title: `${m.members?.name || '회원'}님 회원권 만료 임박`,
                    desc: `${daysLeft}일 남음 · ${m.type}`,
                    time: m.end_date,
                    sortKey: -daysLeft,
                })
            })

            // 오늘 신규 회원
            const { data: newMembers } = await supabase
                .from('members')
                .select('id, name, created_at')
                .gte('created_at', todayStart.toISOString())
                .order('created_at', { ascending: false })
                .limit(5)

            newMembers?.forEach(m => {
                items.push({
                    id: `new-${m.id}`,
                    type: 'success',
                    title: `${m.name}님이 가입했어요`,
                    desc: '새로 등록된 회원',
                    time: m.created_at,
                    sortKey: 0,
                })
            })

            // 오늘 결제
            const { data: todayPayments } = await supabase
                .from('payments')
                .select('*, members(name)')
                .gte('paid_at', todayStart.toISOString())
                .order('paid_at', { ascending: false })
                .limit(5)

            todayPayments?.forEach(p => {
                items.push({
                    id: `pay-${p.id}`,
                    type: 'info',
                    title: `${p.members?.name || '회원'}님 결제 완료`,
                    desc: `${(p.amount || 0).toLocaleString()}원 · ${p.item}`,
                    time: p.paid_at,
                    sortKey: 1,
                })
            })

            items.sort((a, b) => a.sortKey - b.sortKey)
            setNotifications(items)
        } catch (err) {
            console.error('Notifications fetch error:', err)
        } finally {
            setNotifLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('admin_session')
        navigate('/admin/login', { replace: true })
    }

    // 달력 계산
    function getCalendarDays() {
        const year = calMonth.getFullYear()
        const month = calMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startDayOfWeek = firstDay.getDay()
        const days = []
        const prevLast = new Date(year, month, 0).getDate()
        for (let i = startDayOfWeek - 1; i >= 0; i--) days.push({ day: prevLast - i, otherMonth: true })
        for (let i = 1; i <= lastDay.getDate(); i++) days.push({ day: i, otherMonth: false, date: new Date(year, month, i) })
        const remaining = (7 - (days.length % 7)) % 7
        for (let i = 1; i <= remaining; i++) days.push({ day: i, otherMonth: true })
        return days
    }

    function isSameDay(d1, d2) {
        return d1 && d2 &&
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
    }

    function isFuture(date) {
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        return date > today
    }

    const today = new Date()
    const isToday = isSameDay(selectedDate, today)
    const dateLabel = selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

    const monthLabel = `${calMonth.getFullYear()}년 ${calMonth.getMonth() + 1}월`
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']

    function relativeTime(dateStr) {
        const now = new Date()
        const then = new Date(dateStr)
        const diff = Math.floor((now - then) / 1000)
        if (diff < 60) return '방금 전'
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
        return `${Math.floor(diff / 86400)}일 전`
    }

    const unreadCount = notifications.length

    return (
        <div className="admin-layout">
            {/* === 모던 탑바 === */}
            <header className="admin-topbar">
                <div className="admin-topbar-left">
                    <div className="admin-topbar-logo"><Dumbbell size={18} /></div>
                    <span className="admin-topbar-title">바디복싱짐 관리자</span>
                </div>

                <div className="admin-topbar-right">
                    {/* 📅 날짜 선택 */}
                    <div ref={dateRef} style={{ position: 'relative' }}>
                        <button
                            className={`modern-date-btn ${!isToday ? 'active' : ''}`}
                            onClick={() => setDatePopover(v => !v)}
                            title="과거 데이터 조회"
                        >
                            <CalendarDays size={14} />
                            {dateLabel}
                            {!isToday && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>(과거)</span>}
                        </button>

                        {datePopover && (
                            <div className="date-popover">
                                <div className="date-popover-header">
                                    <div className="date-popover-title">{monthLabel}</div>
                                    <div className="date-popover-nav">
                                        <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}>
                                            <ChevronLeft size={14} />
                                        </button>
                                        <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}>
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="date-popover-grid">
                                    {weekdays.map(d => <div key={d} className="date-popover-weekday">{d}</div>)}
                                    {getCalendarDays().map((d, i) => {
                                        const date = d.date
                                        const future = date && isFuture(date)
                                        const selected = date && isSameDay(date, selectedDate)
                                        const isTodayDate = date && isSameDay(date, today)
                                        return (
                                            <button
                                                key={i}
                                                className={`date-popover-day ${d.otherMonth ? 'other-month' : ''} ${selected ? 'selected' : ''} ${isTodayDate ? 'today' : ''}`}
                                                disabled={d.otherMonth || future}
                                                onClick={() => {
                                                    if (date) {
                                                        setSelectedDate(date)
                                                        setDatePopover(false)
                                                    }
                                                }}
                                            >
                                                {d.day}
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="date-popover-footer">
                                    <button onClick={() => { setSelectedDate(today); setCalMonth(today); setDatePopover(false) }}>
                                        <RotateCcw size={11} style={{ display: 'inline', marginRight: 4 }} />
                                        오늘로
                                    </button>
                                    <button className="primary" onClick={() => setDatePopover(false)}>닫기</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 🔔 알림 */}
                    <div ref={notifRef} style={{ position: 'relative' }}>
                        <button
                            className={`modern-icon-btn ${unreadCount > 0 ? 'has-badge' : ''}`}
                            onClick={() => setNotifOpen(v => !v)}
                            title="알림"
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && unreadCount <= 99 && <span className="badge-count">{unreadCount}</span>}
                        </button>

                        {notifOpen && (
                            <div className="modern-dropdown">
                                <div className="modern-dropdown-header">
                                    <div className="modern-dropdown-header-title">
                                        🔔 알림 {notifications.length > 0 && `(${notifications.length})`}
                                    </div>
                                    <button className="modern-dropdown-header-action" onClick={fetchNotifications}>새로고침</button>
                                </div>
                                <div className="modern-dropdown-body">
                                    {notifLoading ? (
                                        <div className="modern-dropdown-empty">로딩 중...</div>
                                    ) : notifications.length === 0 ? (
                                        <div className="modern-dropdown-empty">
                                            ✨ 새로운 알림이 없습니다
                                        </div>
                                    ) : notifications.map(n => (
                                        <button key={n.id} className="modern-dropdown-item">
                                            <div className={`modern-dropdown-item-icon ${n.type}`}>
                                                {n.type === 'warning' && <AlertTriangle size={16} />}
                                                {n.type === 'success' && <UserPlus size={16} />}
                                                {n.type === 'info' && <Wallet size={16} />}
                                            </div>
                                            <div className="modern-dropdown-item-content">
                                                <div className="modern-dropdown-item-title">{n.title}</div>
                                                <div className="modern-dropdown-item-desc">{n.desc}</div>
                                                <div className="modern-dropdown-item-time">{relativeTime(n.time)}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 👤 프로필 드롭다운 */}
                    <div ref={profileRef} style={{ position: 'relative' }}>
                        <button className="modern-profile-btn" onClick={() => setProfileOpen(v => !v)}>
                            <div className="modern-profile-avatar">{adminName.charAt(0)}</div>
                            <div className="modern-profile-info">
                                <span className="modern-profile-name">{adminName}</span>
                                <span className="modern-profile-role">{adminRole}</span>
                            </div>
                            <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
                        </button>

                        {profileOpen && (
                            <div className="modern-dropdown" style={{ minWidth: 240 }}>
                                <div className="modern-dropdown-body">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{adminName}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{adminRole}</div>
                                    </div>
                                    <button className="modern-dropdown-item" onClick={() => { setProfileOpen(false); navigate('/admin/settings') }}>
                                        <div className="modern-dropdown-item-icon info"><UserCircle2 size={16} /></div>
                                        <div className="modern-dropdown-item-content">
                                            <div className="modern-dropdown-item-title">내 프로필</div>
                                            <div className="modern-dropdown-item-desc">정보 확인 및 수정</div>
                                        </div>
                                    </button>
                                    <button className="modern-dropdown-item" onClick={() => { setProfileOpen(false); navigate('/admin/settings') }}>
                                        <div className="modern-dropdown-item-icon warning"><Key size={16} /></div>
                                        <div className="modern-dropdown-item-content">
                                            <div className="modern-dropdown-item-title">비밀번호 변경</div>
                                            <div className="modern-dropdown-item-desc">보안을 위해 정기적으로 변경</div>
                                        </div>
                                    </button>
                                    <div className="modern-dropdown-divider" />
                                    <button className="modern-dropdown-item" onClick={handleLogout}>
                                        <div className="modern-dropdown-item-icon danger"><LogOut size={16} /></div>
                                        <div className="modern-dropdown-item-content">
                                            <div className="modern-dropdown-item-title">로그아웃</div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="admin-body">
                {/* === 사이드바 === */}
                <aside className="admin-sidebar">
                    <nav className="admin-sidebar-nav">
                        <NavLink to="/admin/dashboard" className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}>
                            <span className="admin-sidebar-icon"><LayoutDashboard size={16} /></span>
                            <span>대시보드</span>
                        </NavLink>
                        <NavLink to="/admin/members" className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}>
                            <span className="admin-sidebar-icon"><Users size={16} /></span>
                            <span>회원 관리</span>
                        </NavLink>
                        <NavLink to="/admin/payments" className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}>
                            <span className="admin-sidebar-icon"><CreditCard size={16} /></span>
                            <span>매출/결제</span>
                        </NavLink>
                        <NavLink to="/admin/lessons" className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}>
                            <span className="admin-sidebar-icon"><BookOpen size={16} /></span>
                            <span>수업일지</span>
                        </NavLink>
                        <NavLink to="/admin/notices" className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}>
                            <span className="admin-sidebar-icon"><Megaphone size={16} /></span>
                            <span>공지/메시지</span>
                        </NavLink>
                        <button
                            className="admin-sidebar-item"
                            onClick={() => window.open('/monitor', '_blank', 'fullscreen=yes')}
                        >
                            <span className="admin-sidebar-icon"><Tv size={16} /></span>
                            <span>모니터 화면</span>
                            <Sparkles size={12} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />
                        </button>

                        <div className="admin-sidebar-group">
                            <button
                                className={`admin-sidebar-item ${location.pathname.startsWith('/admin/analysis') ? 'active' : ''}`}
                                onClick={() => setAnalysisOpen(!analysisOpen)}
                            >
                                <span className="admin-sidebar-icon"><BarChart3 size={16} /></span>
                                <span>분석</span>
                                <span className={`admin-sidebar-chevron ${analysisOpen ? 'open' : ''}`}>
                                    <ChevronDown size={12} />
                                </span>
                            </button>
                            {analysisOpen && (
                                <div className="admin-sidebar-submenu">
                                    <NavLink to="/admin/analysis/members-trend" className={({ isActive }) => `admin-sidebar-subitem ${isActive ? 'active' : ''}`}>
                                        📈 회원 추이
                                    </NavLink>
                                    <NavLink to="/admin/analysis/age-stats" className={({ isActive }) => `admin-sidebar-subitem ${isActive ? 'active' : ''}`}>
                                        연령별 현황
                                    </NavLink>
                                    <NavLink to="/admin/analysis/attendance" className={({ isActive }) => `admin-sidebar-subitem ${isActive ? 'active' : ''}`}>
                                        출석 분석
                                    </NavLink>
                                    <NavLink to="/admin/analysis/demographics" className={({ isActive }) => `admin-sidebar-subitem ${isActive ? 'active' : ''}`}>
                                        연령 및 출석
                                    </NavLink>
                                </div>
                            )}
                        </div>
                    </nav>

                    <div className="admin-sidebar-bottom">
                        <NavLink to="/admin/settings" className={({ isActive }) => `admin-sidebar-item ${isActive ? 'active' : ''}`}>
                            <span className="admin-sidebar-icon"><Settings size={16} /></span>
                            <span>설정</span>
                        </NavLink>
                        <button className="admin-sidebar-item" onClick={handleLogout}>
                            <span className="admin-sidebar-icon"><LogOut size={16} /></span>
                            <span>로그아웃</span>
                        </button>
                    </div>
                </aside>

                <main className="admin-main">
                    <Outlet context={{ selectedDate, setSelectedDate }} />
                </main>
            </div>
        </div>
    )
}
