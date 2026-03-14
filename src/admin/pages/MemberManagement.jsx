import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const AVATAR_COLORS = ['#E53E3E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
function getAvatarColor(name) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const AGE_GROUPS = [
    { key: 'elementary', label: '초등', icon: '🧒', range: [7, 12] },
    { key: 'middle', label: '중등', icon: '📚', range: [13, 15] },
    { key: 'high', label: '고등', icon: '🎓', range: [16, 18] },
    { key: 'adult', label: '성인', icon: '👤', range: [19, 999] },
]

export default function MemberManagement() {
    const navigate = useNavigate()
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [ageFilter, setAgeFilter] = useState(null)
    const [genderFilter, setGenderFilter] = useState(null)
    const [selectedMember, setSelectedMember] = useState(null)
    const [memberDetail, setMemberDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [editForm, setEditForm] = useState({})
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(false)
    const [calendarMonth, setCalendarMonth] = useState(new Date())
    const [lockerEdit, setLockerEdit] = useState(false)
    const [lockerNumber, setLockerNumber] = useState('')

    useEffect(() => {
        fetchMembers()
    }, [])

    async function fetchMembers() {
        try {
            const { data: membersData, error } = await supabase
                .from('members')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            const enriched = await Promise.all((membersData || []).map(async (m) => {
                const { data: membership } = await supabase
                    .from('memberships')
                    .select('*')
                    .eq('member_id', m.id)
                    .order('end_date', { ascending: false })
                    .limit(1)
                    .single()

                const { data: lastAttendance } = await supabase
                    .from('attendance')
                    .select('checked_at')
                    .eq('member_id', m.id)
                    .order('checked_at', { ascending: false })
                    .limit(1)
                    .single()

                const now = new Date()
                let membershipStatus = 'none'
                if (membership) {
                    const endDate = new Date(membership.end_date)
                    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
                    if (daysLeft < 0) membershipStatus = 'expired'
                    else if (daysLeft <= 7) membershipStatus = 'expiring_soon'
                    else membershipStatus = 'active'
                }

                return {
                    ...m,
                    membership,
                    membershipStatus,
                    lastVisit: lastAttendance?.checked_at || null,
                }
            }))

            setMembers(enriched)

            // 첫 회원 자동 선택
            if (enriched.length > 0 && !selectedMember) {
                fetchMemberDetail(enriched[0])
            }
        } catch (err) {
            console.error('Members fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchMemberDetail(member) {
        setSelectedMember(member)
        setDetailLoading(true)
        setEditMode(false)
        setDeleteConfirm(false)
        setLockerEdit(false)
        setLockerNumber(member.locker_number || '')

        try {
            // 출석 기록 (최근 60건 - 캘린더용)
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('*')
                .eq('member_id', member.id)
                .order('checked_at', { ascending: false })
                .limit(60)

            // 회원권 내역
            const { data: membershipData } = await supabase
                .from('memberships')
                .select('*')
                .eq('member_id', member.id)
                .order('start_date', { ascending: false })

            // 결제 내역
            const { data: paymentData } = await supabase
                .from('payments')
                .select('*')
                .eq('member_id', member.id)
                .order('paid_at', { ascending: false })

            // 코치 노트
            const { data: notesData } = await supabase
                .from('coach_notes')
                .select('*')
                .eq('member_id', member.id)
                .order('created_at', { ascending: false })
                .limit(5)

            // 출석률 계산 (이번 달)
            const now = new Date()
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
            const thisMonthAttendance = (attendanceData || []).filter(a => {
                const d = new Date(a.checked_at)
                return d >= monthStart && !a.qr_data?.startsWith('exit-')
            })
            const daysPassed = Math.max(1, Math.floor((now - monthStart) / (1000 * 60 * 60 * 24)))
            const attendanceRate = Math.min(100, Math.round((thisMonthAttendance.length / daysPassed) * 100))

            // 총 운동 시간 계산 (대략적)
            const totalSessions = (attendanceData || []).filter(a => !a.qr_data?.startsWith('exit-')).length
            const totalHours = (totalSessions * 1.5).toFixed(1)

            setMemberDetail({
                attendance: attendanceData || [],
                memberships: membershipData || [],
                payments: paymentData || [],
                notes: notesData || [],
                attendanceRate,
                totalHours,
                totalSessions,
            })
        } catch (err) {
            console.error('Detail fetch error:', err)
            setMemberDetail({ attendance: [], memberships: [], payments: [], notes: [], attendanceRate: 0, totalHours: '0', totalSessions: 0 })
        } finally {
            setDetailLoading(false)
        }
    }

    async function handleSave() {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('members')
                .update({
                    name: editForm.name,
                    phone: editForm.phone,
                    age: Number(editForm.age),
                    gender: editForm.gender,
                })
                .eq('id', selectedMember.id)

            if (error) throw error
            setEditMode(false)
            const updatedMember = { ...selectedMember, ...editForm, age: Number(editForm.age) }
            setSelectedMember(updatedMember)
            fetchMembers()
        } catch (err) {
            console.error('Update error:', err)
            alert('수정 중 오류가 발생했습니다')
        } finally {
            setSaving(false)
        }
    }

    async function handleLockerSave() {
        try {
            const { error } = await supabase
                .from('members')
                .update({ locker_number: lockerNumber.trim() || null })
                .eq('id', selectedMember.id)

            if (error) throw error
            setSelectedMember(prev => ({ ...prev, locker_number: lockerNumber.trim() || null }))
            setLockerEdit(false)
            fetchMembers()
        } catch (err) {
            console.error('Locker update error:', err)
            alert('라커 변경 중 오류가 발생했습니다')
        }
    }

    async function handleDelete() {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('members')
                .delete()
                .eq('id', selectedMember.id)

            if (error) throw error
            setSelectedMember(null)
            setMemberDetail(null)
            fetchMembers()
        } catch (err) {
            console.error('Delete error:', err)
            alert('삭제 중 오류가 발생했습니다')
        } finally {
            setSaving(false)
        }
    }

    async function handleAddNote(content) {
        if (!content.trim() || !selectedMember) return
        try {
            const session = JSON.parse(localStorage.getItem('admin_session') || '{}')
            const { error } = await supabase
                .from('coach_notes')
                .insert({
                    member_id: selectedMember.id,
                    content: content.trim(),
                })

            if (error) throw error
            fetchMemberDetail(selectedMember)
        } catch (err) {
            console.error('Note add error:', err)
            alert('노트 추가 중 오류가 발생했습니다')
        }
    }

    // 필터링
    const filtered = members.filter(m => {
        const matchSearch = search === '' ||
            m.name?.toLowerCase().includes(search.toLowerCase()) ||
            m.phone?.includes(search)
        const matchStatus = statusFilter === 'all' || m.membershipStatus === statusFilter
        const matchAge = !ageFilter || (() => {
            const group = AGE_GROUPS.find(g => g.key === ageFilter)
            if (!group) return false
            // 나이가 없는 회원은 성인으로 취급
            const memberAge = m.age || 20
            return memberAge >= group.range[0] && memberAge <= group.range[1]
        })()
        const matchGender = !genderFilter || m.gender === genderFilter
        return matchSearch && matchStatus && (ageFilter ? matchAge : true) && (genderFilter ? matchGender : true)
    })

    const statusLabel = (s) => {
        switch (s) {
            case 'active': return '활성'
            case 'expiring_soon': return '만료임박'
            case 'expired': return '만료'
            default: return '미등록'
        }
    }

    const membershipTypeLabel = (m) => {
        if (!m.membership) return 'FREE'
        return m.membership.type?.toUpperCase() || 'BASIC'
    }

    const formatDate = (d) => {
        if (!d) return '-'
        const date = new Date(d)
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }

    const formatDateShort = (d) => {
        if (!d) return '-'
        const date = new Date(d)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const formatDateTime = (d) => {
        if (!d) return '-'
        const date = new Date(d)
        return date.toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        }).toUpperCase()
    }

    const timeAgo = (d) => {
        if (!d) return ''
        const now = new Date()
        const date = new Date(d)
        const diff = Math.floor((now - date) / 1000)
        if (diff < 60) return '방금 전'
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
        return `${Math.floor(diff / 86400)}일 전`
    }

    // 캘린더 날짜 계산
    const getCalendarDays = () => {
        const year = calendarMonth.getFullYear()
        const month = calendarMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startDayOfWeek = (firstDay.getDay() + 6) % 7 // 월요일 시작

        const days = []
        // 이전 달의 마지막 날들
        const prevMonthLastDay = new Date(year, month, 0).getDate()
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            days.push({ day: prevMonthLastDay - i, currentMonth: false })
        }
        // 현재 달
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ day: i, currentMonth: true })
        }
        // 다음 달 (현재 행 채우기만 - 7의 배수로 맞추기)
        const remaining = (7 - (days.length % 7)) % 7
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, currentMonth: false })
        }
        return days
    }

    const getAttendanceDays = () => {
        if (!memberDetail) return new Set()
        const year = calendarMonth.getFullYear()
        const month = calendarMonth.getMonth()
        const days = new Set()
        memberDetail.attendance.forEach(a => {
            if (a.qr_data?.startsWith('exit-')) return
            const d = new Date(a.checked_at)
            if (d.getFullYear() === year && d.getMonth() === month) {
                days.add(d.getDate())
            }
        })
        return days
    }

    const isToday = (day) => {
        const now = new Date()
        return day === now.getDate() &&
            calendarMonth.getMonth() === now.getMonth() &&
            calendarMonth.getFullYear() === now.getFullYear()
    }

    const getDaysLeft = () => {
        if (!selectedMember?.membership) return 0
        const end = new Date(selectedMember.membership.end_date)
        const now = new Date()
        return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
    }

    // 활동 로그 생성 (출석 + 결제 합쳐서 시간순)
    const getActivityLog = () => {
        if (!memberDetail) return []
        const logs = []

        memberDetail.attendance.slice(0, 10).forEach(a => {
            const isExit = a.qr_data?.startsWith('exit-')
            logs.push({
                type: isExit ? 'exit' : 'entry',
                title: isExit ? '퇴장' : '입장 체크인',
                desc: isExit ? '운동 종료' : '체육관 입장',
                date: a.checked_at,
                highlight: !isExit,
            })
        })

        memberDetail.payments.slice(0, 5).forEach(p => {
            logs.push({
                type: 'payment',
                title: `${p.item} 결제`,
                desc: `${(p.amount || 0).toLocaleString()}원 - ${p.method === 'card' ? '카드' : p.method === 'cash' ? '현금' : '계좌이체'}`,
                date: p.paid_at,
                highlight: false,
            })
        })

        memberDetail.memberships.slice(0, 3).forEach(ms => {
            logs.push({
                type: 'membership',
                title: '회원권 갱신',
                desc: `${ms.type} 회원권 (${formatDate(ms.start_date)} ~ ${formatDate(ms.end_date)})`,
                date: ms.created_at,
                highlight: false,
            })
        })

        return logs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
    }

    if (loading) {
        return (
            <div className="mm-loading">
                <div className="mm-loading-spinner"></div>
                <p>회원 정보를 불러오는 중...</p>
            </div>
        )
    }

    const calendarDays = getCalendarDays()
    const attendanceDays = getAttendanceDays()
    const activityLog = getActivityLog()
    const daysLeft = getDaysLeft()
    const calendarMonthLabel = `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`

    return (
        <div className="mm-split-layout">
            {/* ===== 왼쪽 패널: 회원 목록 ===== */}
            <div className="mm-left-panel">
                <div className="mm-left-top">
                    {/* 검색바 */}
                    <div className="mm-search-bar">
                        <span className="mm-search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="회원명 또는 연락처 검색..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* 상태 탭 */}
                    <div className="mm-status-tabs">
                        {['active', 'expiring_soon', 'expired'].map(s => (
                            <button
                                key={s}
                                className={`mm-status-tab ${statusFilter === s ? 'active' : ''}`}
                                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                            >
                                {statusLabel(s)}
                            </button>
                        ))}
                    </div>

                    {/* 연령대 & 성별 필터 */}
                    <div className="mm-filter-row">
                        <div className="mm-age-filters">
                            {AGE_GROUPS.map(g => (
                                <button
                                    key={g.key}
                                    className={`mm-age-btn ${ageFilter === g.key ? 'active' : ''}`}
                                    onClick={() => setAgeFilter(ageFilter === g.key ? null : g.key)}
                                >
                                    <span className="mm-age-icon">{g.icon}</span>
                                    {g.label}
                                </button>
                            ))}
                        </div>
                        <div className="mm-gender-filters">
                            <button
                                className={`mm-gender-btn ${genderFilter === 'male' ? 'active' : ''}`}
                                onClick={() => setGenderFilter(genderFilter === 'male' ? null : 'male')}
                            >남</button>
                            <button
                                className={`mm-gender-btn ${genderFilter === 'female' ? 'active' : ''}`}
                                onClick={() => setGenderFilter(genderFilter === 'female' ? null : 'female')}
                            >여</button>
                        </div>
                    </div>
                </div>

                {/* 회원 리스트 */}
                <div className="mm-member-list">
                    <p className="mm-result-label">
                        검색 결과: {filtered.length}명
                        {(ageFilter || genderFilter) && ' (필터 적용됨)'}
                    </p>
                    {filtered.map((m) => {
                        const isSelected = selectedMember?.id === m.id
                        const isOnSite = m.lastVisit && (new Date() - new Date(m.lastVisit)) < 3600000
                        return (
                            <div
                                key={m.id}
                                className={`mm-member-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => fetchMemberDetail(m)}
                            >
                                <div className="mm-card-avatar-wrap">
                                    <div
                                        className="mm-card-avatar"
                                        style={{ background: getAvatarColor(m.name || '') }}
                                    >
                                        {(m.name || '?').charAt(0)}
                                    </div>
                                    <span className={`mm-card-status-dot ${isOnSite ? 'online' : 'offline'}`}></span>
                                </div>
                                <div className="mm-card-info">
                                    <div className="mm-card-name-row">
                                        <span className="mm-card-name">{m.name}</span>
                                        {m.age && <span className="mm-card-tag">{m.age >= 19 ? '성인' : m.age >= 16 ? '고등' : m.age >= 13 ? '중등' : '초등'}</span>}
                                        {m.gender && <span className="mm-card-tag">{m.gender === 'male' ? '남' : '여'}</span>}
                                    </div>
                                    <p className={`mm-card-membership ${m.membershipStatus === 'active' ? 'active' : ''}`}>
                                        {membershipTypeLabel(m)}
                                    </p>
                                </div>
                                <div className="mm-card-right">
                                    {isOnSite ? (
                                        <span className="mm-card-onsite">ON SITE</span>
                                    ) : m.lastVisit ? (
                                        <span className="mm-card-time">{timeAgo(m.lastVisit)}</span>
                                    ) : null}
                                </div>
                            </div>
                        )
                    })}
                    {filtered.length === 0 && (
                        <div className="mm-empty-list">
                            <span>👤</span>
                            <p>{search ? '검색 결과가 없습니다' : '해당 조건의 회원이 없습니다'}</p>
                        </div>
                    )}
                </div>

                {/* 신규 회원 등록 버튼 */}
                <div className="mm-register-btn-wrap">
                    <button
                        className="mm-register-btn"
                        onClick={() => navigate('/admin/members/register')}
                    >
                        👤+ 신규 회원 등록
                    </button>
                </div>
            </div>

            {/* ===== 오른쪽 패널: 회원 상세 ===== */}
            <div className="mm-right-panel">
                {!selectedMember ? (
                    <div className="mm-no-selection">
                        <span className="mm-no-icon">👈</span>
                        <h3>회원을 선택해주세요</h3>
                        <p>왼쪽 목록에서 회원을 클릭하면 상세 정보가 표시됩니다</p>
                    </div>
                ) : detailLoading ? (
                    <div className="mm-loading">
                        <div className="mm-loading-spinner"></div>
                        <p>상세 정보 로딩 중...</p>
                    </div>
                ) : (
                    <div className="mm-detail-content">
                        <div className="mm-detail-grid">
                            {/* 프로필 헤더 */}
                            <div className="mm-profile-header">
                                <div className="mm-profile-left">
                                    <div
                                        className="mm-profile-avatar"
                                        style={{ background: getAvatarColor(selectedMember.name || '') }}
                                    >
                                        {(selectedMember.name || '?').charAt(0)}
                                    </div>
                                    <div className="mm-profile-info">
                                        {editMode ? (
                                            <input
                                                className="mm-edit-input name"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                        ) : (
                                            <h2 className="mm-profile-name">{selectedMember.name}</h2>
                                        )}
                                        <div className="mm-profile-meta">
                                            <span className={`mm-profile-grade ${selectedMember.membershipStatus}`}>
                                                {statusLabel(selectedMember.membershipStatus)}
                                            </span>
                                            {editMode ? (
                                                <input
                                                    className="mm-edit-input"
                                                    value={editForm.phone}
                                                    placeholder="전화번호"
                                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                />
                                            ) : (
                                                <>
                                                    <span className="mm-profile-detail">📱 {selectedMember.phone || '-'}</span>
                                                </>
                                            )}
                                        </div>
                                        {editMode && (
                                            <div className="mm-edit-extra">
                                                <input
                                                    className="mm-edit-input small"
                                                    type="number"
                                                    value={editForm.age}
                                                    placeholder="나이"
                                                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                                                />
                                                <div className="mm-edit-gender-btns">
                                                    <button
                                                        className={`mm-edit-gender-btn ${editForm.gender === 'male' ? 'active' : ''}`}
                                                        onClick={() => setEditForm({ ...editForm, gender: 'male' })}
                                                    >남</button>
                                                    <button
                                                        className={`mm-edit-gender-btn ${editForm.gender === 'female' ? 'active' : ''}`}
                                                        onClick={() => setEditForm({ ...editForm, gender: 'female' })}
                                                    >여</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mm-profile-actions">
                                    {editMode ? (
                                        <>
                                            <button className="mm-action-btn save" onClick={handleSave} disabled={saving}>
                                                {saving ? '...' : '💾'}
                                            </button>
                                            <button className="mm-action-btn cancel" onClick={() => setEditMode(false)}>✕</button>
                                        </>
                                    ) : (
                                        <>
                                            <button className="mm-action-btn edit" onClick={() => {
                                                setEditForm({
                                                    name: selectedMember.name || '',
                                                    phone: selectedMember.phone || '',
                                                    age: selectedMember.age || '',
                                                    gender: selectedMember.gender || '',
                                                })
                                                setEditMode(true)
                                            }}>✏️</button>
                                            {deleteConfirm ? (
                                                <>
                                                    <button className="mm-action-btn delete-confirm" onClick={handleDelete} disabled={saving}>
                                                        {saving ? '...' : '확인'}
                                                    </button>
                                                    <button className="mm-action-btn cancel" onClick={() => setDeleteConfirm(false)}>취소</button>
                                                </>
                                            ) : (
                                                <button className="mm-action-btn delete" onClick={() => setDeleteConfirm(true)}>🗑️</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 통계 그리드 */}
                            <div className="mm-stats-grid">
                                <div className="mm-stat-card">
                                    <span className="mm-stat-label">출석률</span>
                                    <span className="mm-stat-value">{memberDetail?.attendanceRate || 0}%</span>
                                    <div className="mm-stat-bar">
                                        <div className="mm-stat-bar-fill" style={{ width: `${memberDetail?.attendanceRate || 0}%` }}></div>
                                    </div>
                                </div>
                                <div className="mm-stat-card">
                                    <span className="mm-stat-label">운동 시간</span>
                                    <span className="mm-stat-value">{memberDetail?.totalHours || 0} <small>hrs</small></span>
                                </div>
                                <div className="mm-stat-card">
                                    <span className="mm-stat-label">총 세션</span>
                                    <span className="mm-stat-value">{memberDetail?.totalSessions || 0} <small>회</small></span>
                                </div>
                                <div className="mm-stat-card">
                                    <span className="mm-stat-label">최근 방문</span>
                                    <span className="mm-stat-value small">{timeAgo(selectedMember.lastVisit) || '-'}</span>
                                </div>
                            </div>

                            {/* 메인 콘텐츠 영역 */}
                            <div className="mm-main-panels">
                                {/* 왼쪽: 캘린더 + 활동로그 */}
                                <div className="mm-main-left">
                                    {/* 출석 캘린더 */}
                                    <div className="mm-calendar-card">
                                        <div className="mm-calendar-header">
                                            <h4>📅 출석 현황 - {calendarMonthLabel}</h4>
                                            <div className="mm-calendar-nav">
                                                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}>◀</button>
                                                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}>▶</button>
                                            </div>
                                        </div>
                                        <div className="mm-calendar-legend">
                                            <span className="mm-legend-item"><span className="mm-legend-dot attended"></span>세션 참여</span>
                                            <span className="mm-legend-item"><span className="mm-legend-dot absent"></span>결석</span>
                                        </div>
                                        <div className="mm-calendar-grid">
                                            {['월', '화', '수', '목', '금', '토', '일'].map(d => (
                                                <div key={d} className="mm-cal-header">{d}</div>
                                            ))}
                                            {calendarDays.map((d, i) => {
                                                const attended = d.currentMonth && attendanceDays.has(d.day)
                                                const today = d.currentMonth && isToday(d.day)
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`mm-cal-day ${!d.currentMonth ? 'other-month' : ''} ${attended ? 'attended' : ''} ${today ? 'today' : ''}`}
                                                    >
                                                        {d.day}
                                                        {attended && <span className="mm-cal-dot"></span>}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* 활동 로그 */}
                                    <div className="mm-activity-log">
                                        <h4>⏱️ 활동 로그</h4>
                                        <div className="mm-timeline">
                                            {activityLog.length > 0 ? activityLog.map((log, i) => (
                                                <div key={i} className="mm-timeline-item">
                                                    <div className={`mm-timeline-dot ${log.highlight ? 'highlight' : ''}`}></div>
                                                    <div className="mm-timeline-content">
                                                        <div className="mm-timeline-header">
                                                            <span className="mm-timeline-title">{log.title}</span>
                                                            <span className="mm-timeline-date">{formatDateTime(log.date)}</span>
                                                        </div>
                                                        <p className="mm-timeline-desc">{log.desc}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="mm-empty-text">활동 기록이 없습니다</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 오른쪽: 회원권 + 코치노트 */}
                                <div className="mm-main-right">
                                    {/* 회원권 카드 */}
                                    <div className={`mm-membership-card ${selectedMember.membershipStatus}`}>
                                        <div className="mm-membership-bg-icon">⭐</div>
                                        <span className="mm-membership-label">회원 등급</span>
                                        <h3 className="mm-membership-type">
                                            {selectedMember.membership ? selectedMember.membership.type : '미등록'}
                                            {selectedMember.membershipStatus === 'active' && ' ✓'}
                                        </h3>
                                        {selectedMember.membership && (
                                            <div className="mm-membership-dates">
                                                <div className="mm-membership-row">
                                                    <span>만료일:</span>
                                                    <span className="mm-membership-val">{formatDateShort(selectedMember.membership.end_date)}</span>
                                                </div>
                                                <div className="mm-membership-row">
                                                    <span>남은 기간:</span>
                                                    <span className="mm-membership-val">{daysLeft} Days</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 라커 배정 */}
                                    <div className="mm-locker-card">
                                        <h4>🔑 라커 배정</h4>
                                        <div className="mm-locker-content">
                                            {lockerEdit ? (
                                                <div className="mm-locker-edit">
                                                    <input
                                                        className="mm-locker-input"
                                                        value={lockerNumber}
                                                        onChange={(e) => setLockerNumber(e.target.value)}
                                                        placeholder="예: A-042"
                                                        onKeyDown={(e) => e.key === 'Enter' && handleLockerSave()}
                                                        autoFocus
                                                    />
                                                    <button className="mm-locker-save" onClick={handleLockerSave}>저장</button>
                                                    <button className="mm-locker-cancel" onClick={() => { setLockerEdit(false); setLockerNumber(selectedMember.locker_number || '') }}>취소</button>
                                                </div>
                                            ) : (
                                                <div className="mm-locker-display">
                                                    <div>
                                                        <span className="mm-locker-label">라커 번호</span>
                                                        <span className="mm-locker-number">{selectedMember.locker_number ? `#${selectedMember.locker_number}` : '미배정'}</span>
                                                    </div>
                                                    <button className="mm-locker-change-btn" onClick={() => setLockerEdit(true)}>변경</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 코치 노트 */}
                                    <div className="mm-coach-notes">
                                        <h4>📝 코치 노트</h4>
                                        <div className="mm-notes-list">
                                            {memberDetail?.notes?.length > 0 ? memberDetail.notes.map((n, i) => (
                                                <div key={i} className="mm-note-item">
                                                    <p className="mm-note-text">"{n.content}"</p>
                                                    <span className="mm-note-date">{timeAgo(n.created_at)}</span>
                                                </div>
                                            )) : (
                                                <p className="mm-empty-text">등록된 노트가 없습니다</p>
                                            )}
                                        </div>
                                        <NoteInput onSubmit={handleAddNote} />
                                    </div>

                                    {/* 결제 내역 요약 */}
                                    {memberDetail?.payments?.length > 0 && (
                                        <div className="mm-payment-summary">
                                            <h4>💰 최근 결제</h4>
                                            {memberDetail.payments.slice(0, 3).map((p, i) => (
                                                <div key={i} className="mm-payment-item">
                                                    <div className="mm-payment-info">
                                                        <span className="mm-payment-type">{p.item}</span>
                                                        <span className="mm-payment-method">
                                                            {p.method === 'card' ? '💳' : p.method === 'cash' ? '💵' : '🏦'}
                                                        </span>
                                                    </div>
                                                    <div className="mm-payment-right">
                                                        <span className="mm-payment-amount">{(p.amount || 0).toLocaleString()}원</span>
                                                        <span className="mm-payment-date">{formatDate(p.paid_at)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// 코치 노트 입력 컴포넌트
function NoteInput({ onSubmit }) {
    const [text, setText] = useState('')
    const handleSubmit = () => {
        if (text.trim()) {
            onSubmit(text)
            setText('')
        }
    }
    return (
        <div className="mm-note-input-wrap">
            <input
                type="text"
                className="mm-note-input"
                placeholder="새 노트를 입력하세요..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button className="mm-note-submit" onClick={handleSubmit}>추가</button>
        </div>
    )
}
