import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
    Search, UserPlus, ChevronLeft, ChevronRight, X, Edit3, Trash2, Save,
    Key, MessageSquare, CreditCard, Smartphone, User, Users, UserCheck,
    AlertCircle, Sparkles, LayoutGrid, List, Filter, Calendar,
    TrendingUp, Activity, Award, Clock,
} from 'lucide-react'

const AVATAR_COLORS = ['#FF3B47', '#0A84FF', '#30D158', '#FFD60A', '#BF5AF2', '#FF9500', '#FF6B35', '#5E5CE6']
function getAvatarColor(name) {
    let hash = 0
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const AGE_GROUPS = [
    { key: 'elementary', label: '초등', icon: '🧒', range: [7, 12] },
    { key: 'middle', label: '중등', icon: '📚', range: [13, 15] },
    { key: 'high', label: '고등', icon: '🎓', range: [16, 18] },
    { key: 'adult', label: '성인', icon: '👤', range: [19, 999] },
]

function getAgeGroup(age) {
    if (!age) return null
    return AGE_GROUPS.find(g => age >= g.range[0] && age <= g.range[1])
}

function statusInfo(s) {
    switch (s) {
        case 'active': return { label: '활성', color: 'success' }
        case 'expiring_soon': return { label: '만료임박', color: 'warning' }
        case 'expired': return { label: '만료', color: 'danger' }
        default: return { label: '미등록', color: 'neutral' }
    }
}

function timeAgo(d) {
    if (!d) return ''
    const diff = Math.floor((new Date() - new Date(d)) / 1000)
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
}

function formatDate(d) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatDateTime(d) {
    if (!d) return '-'
    return new Date(d).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function MemberManagement() {
    const navigate = useNavigate()
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [ageFilter, setAgeFilter] = useState(null)
    const [genderFilter, setGenderFilter] = useState(null)
    const [view, setView] = useState('grid') // 'grid' | 'list'
    const [showFilters, setShowFilters] = useState(false)

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
    const [noteText, setNoteText] = useState('')

    useEffect(() => { fetchMembers() }, [])

    // ⌨️ 키보드 단축키 (ESC로 패널 닫기)
    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape') closePanel()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [])

    async function fetchMembers() {
        try {
            const { data: membersData, error } = await supabase
                .from('members').select('*').order('created_at', { ascending: false })
            if (error) throw error

            // 모든 회원의 attendance를 한 번에 가져오기 (성능 최적화)
            const memberIds = (membersData || []).map(m => m.id)
            const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

            const [
                { data: allMemberships },
                { data: recentAttendance },
            ] = await Promise.all([
                supabase.from('memberships').select('*').in('member_id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']),
                supabase.from('attendance').select('member_id, checked_at, qr_data')
                    .in('member_id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000'])
                    .gte('checked_at', sevenDaysAgo),
            ])

            // 회원별로 그룹화
            const membershipsByMember = {}
            allMemberships?.forEach(m => {
                if (!membershipsByMember[m.member_id]) membershipsByMember[m.member_id] = []
                membershipsByMember[m.member_id].push(m)
            })

            const attendanceByMember = {}
            recentAttendance?.forEach(a => {
                if (!attendanceByMember[a.member_id]) attendanceByMember[a.member_id] = []
                attendanceByMember[a.member_id].push(a)
            })

            const enriched = (membersData || []).map(m => {
                const memberships = (membershipsByMember[m.id] || []).sort((a, b) =>
                    new Date(b.end_date) - new Date(a.end_date)
                )
                const membership = memberships[0]
                const attendances = attendanceByMember[m.id] || []
                const lastVisit = attendances.length > 0
                    ? attendances.sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at))[0].checked_at
                    : null

                const now = new Date()
                let membershipStatus = 'none'
                if (membership) {
                    const daysLeft = Math.ceil((new Date(membership.end_date) - now) / 86400000)
                    if (daysLeft < 0) membershipStatus = 'expired'
                    else if (daysLeft <= 7) membershipStatus = 'expiring_soon'
                    else membershipStatus = 'active'
                }

                // 7일 출석 히트맵 (입장만)
                const heatmap = Array(7).fill(0)
                attendances.forEach(a => {
                    if (a.qr_data?.startsWith('exit-')) return
                    const dayDiff = Math.floor((new Date() - new Date(a.checked_at)) / 86400000)
                    if (dayDiff >= 0 && dayDiff < 7) heatmap[6 - dayDiff]++
                })

                return { ...m, membership, membershipStatus, lastVisit, heatmap }
            })

            setMembers(enriched)
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
            const [
                { data: attendance },
                { data: memberships },
                { data: payments },
                { data: notes },
            ] = await Promise.all([
                supabase.from('attendance').select('*').eq('member_id', member.id)
                    .order('checked_at', { ascending: false }).limit(60),
                supabase.from('memberships').select('*').eq('member_id', member.id)
                    .order('start_date', { ascending: false }),
                supabase.from('payments').select('*').eq('member_id', member.id)
                    .order('paid_at', { ascending: false }),
                supabase.from('coach_notes').select('*').eq('member_id', member.id)
                    .order('created_at', { ascending: false }).limit(5),
            ])

            const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            const thisMonth = (attendance || []).filter(a =>
                new Date(a.checked_at) >= monthStart && !a.qr_data?.startsWith('exit-')
            )
            const totalSessions = (attendance || []).filter(a => !a.qr_data?.startsWith('exit-')).length

            setMemberDetail({
                attendance: attendance || [],
                memberships: memberships || [],
                payments: payments || [],
                notes: notes || [],
                thisMonthCount: thisMonth.length,
                totalSessions,
                totalHours: (totalSessions * 1.5).toFixed(1),
            })
        } catch (err) {
            console.error('Detail fetch error:', err)
            setMemberDetail({ attendance: [], memberships: [], payments: [], notes: [], thisMonthCount: 0, totalSessions: 0, totalHours: '0' })
        } finally {
            setDetailLoading(false)
        }
    }

    function closePanel() {
        setSelectedMember(null)
        setMemberDetail(null)
        setEditMode(false)
        setDeleteConfirm(false)
    }

    async function handleSave() {
        setSaving(true)
        try {
            const { error } = await supabase.from('members').update({
                name: editForm.name, phone: editForm.phone,
                age: Number(editForm.age), gender: editForm.gender,
            }).eq('id', selectedMember.id)
            if (error) throw error
            setEditMode(false)
            const updated = { ...selectedMember, ...editForm, age: Number(editForm.age) }
            setSelectedMember(updated)
            fetchMembers()
        } catch (err) {
            console.error(err); alert('수정 실패')
        } finally {
            setSaving(false)
        }
    }

    async function handleLockerSave() {
        try {
            await supabase.from('members').update({ locker_number: lockerNumber.trim() || null })
                .eq('id', selectedMember.id)
            setSelectedMember(p => ({ ...p, locker_number: lockerNumber.trim() || null }))
            setLockerEdit(false)
            fetchMembers()
        } catch (err) { console.error(err) }
    }

    async function handleDelete() {
        setSaving(true)
        try {
            await supabase.from('members').delete().eq('id', selectedMember.id)
            closePanel()
            fetchMembers()
        } catch (err) { alert('삭제 실패') }
        finally { setSaving(false) }
    }

    async function handleAddNote() {
        if (!noteText.trim()) return
        try {
            await supabase.from('coach_notes').insert({
                member_id: selectedMember.id, content: noteText.trim(),
            })
            setNoteText('')
            fetchMemberDetail(selectedMember)
        } catch (err) { console.error(err) }
    }

    // === 통계 계산 ===
    const stats = useMemo(() => {
        const now = new Date()
        const monthAgo = new Date(now.getTime() - 30 * 86400000)
        return {
            total: members.length,
            active: members.filter(m => m.membershipStatus === 'active').length,
            expiring: members.filter(m => m.membershipStatus === 'expiring_soon').length,
            newWeek: members.filter(m => new Date(m.created_at) >= monthAgo).length,
            onsite: members.filter(m => m.lastVisit && (new Date() - new Date(m.lastVisit)) < 3600000).length,
        }
    }, [members])

    // === 필터링 ===
    const filtered = useMemo(() => {
        return members.filter(m => {
            const matchSearch = !search ||
                m.name?.toLowerCase().includes(search.toLowerCase()) ||
                m.phone?.includes(search)
            const matchStatus = statusFilter === 'all' || m.membershipStatus === statusFilter
            const matchAge = !ageFilter || (() => {
                const g = AGE_GROUPS.find(g => g.key === ageFilter)
                if (!g) return false
                const a = m.age || 20
                return a >= g.range[0] && a <= g.range[1]
            })()
            const matchGender = !genderFilter || m.gender === genderFilter
            return matchSearch && matchStatus && matchAge && matchGender
        })
    }, [members, search, statusFilter, ageFilter, genderFilter])

    if (loading) {
        return (
            <div className="mm2-loading">
                <div className="mm2-spinner" />
                <p>회원 정보 불러오는 중...</p>
            </div>
        )
    }

    const activeFilterCount = (ageFilter ? 1 : 0) + (genderFilter ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)

    return (
        <div className="mm2-page">
            {/* === 헤더 === */}
            <div className="mm2-header">
                <div>
                    <h1 className="mm2-title">회원 관리</h1>
                    <p className="mm2-subtitle">{members.length}명의 회원 · 오늘도 화이팅 🥊</p>
                </div>
                <button
                    className="mm2-cta-btn"
                    onClick={() => navigate('/admin/members/register')}
                >
                    <UserPlus size={16} />
                    신규 회원 등록
                </button>
            </div>

            {/* === 통계 카드 4개 === */}
            <div className="mm2-stat-row">
                <StatCard
                    icon={<Users size={18} />}
                    iconColor="accent"
                    label="전체 회원"
                    value={stats.total}
                    unit="명"
                    sub={stats.onsite > 0 ? `🟢 지금 ${stats.onsite}명 운동 중` : '대기 중'}
                />
                <StatCard
                    icon={<UserCheck size={18} />}
                    iconColor="success"
                    label="활성 회원"
                    value={stats.active}
                    unit="명"
                    sub={`전체의 ${stats.total > 0 ? Math.round(stats.active / stats.total * 100) : 0}%`}
                    badge={stats.active}
                    badgeMax={stats.total}
                />
                <StatCard
                    icon={<AlertCircle size={18} />}
                    iconColor="warning"
                    label="만료 임박"
                    value={stats.expiring}
                    unit="명"
                    sub={stats.expiring > 0 ? '7일 이내 만료 예정' : '안정적 상태'}
                />
                <StatCard
                    icon={<Sparkles size={18} />}
                    iconColor="info"
                    label="이번 달 신규"
                    value={stats.newWeek}
                    unit="명"
                    sub="최근 30일 가입"
                />
            </div>

            {/* === 툴바 (검색 + 필터 + 뷰 전환) === */}
            <div className="mm2-toolbar">
                <div className="mm2-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="이름 또는 전화번호 검색..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="mm2-search-clear" onClick={() => setSearch('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="mm2-status-pills">
                    {[
                        { key: 'all', label: '모두' },
                        { key: 'active', label: '활성', color: 'success' },
                        { key: 'expiring_soon', label: '만료임박', color: 'warning' },
                        { key: 'expired', label: '만료', color: 'danger' },
                    ].map(p => (
                        <button
                            key={p.key}
                            className={`mm2-status-pill ${statusFilter === p.key ? 'active' : ''} ${p.color || ''}`}
                            onClick={() => setStatusFilter(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <button
                    className={`mm2-filter-btn ${activeFilterCount > 0 ? 'has-filters' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter size={14} />
                    <span>필터</span>
                    {activeFilterCount > 0 && <span className="mm2-filter-count">{activeFilterCount}</span>}
                </button>

                <div className="mm2-view-toggle">
                    <button
                        className={view === 'grid' ? 'active' : ''}
                        onClick={() => setView('grid')}
                        title="그리드 보기"
                    >
                        <LayoutGrid size={14} />
                    </button>
                    <button
                        className={view === 'list' ? 'active' : ''}
                        onClick={() => setView('list')}
                        title="리스트 보기"
                    >
                        <List size={14} />
                    </button>
                </div>
            </div>

            {/* 확장 필터 (연령/성별) */}
            {showFilters && (
                <div className="mm2-filter-panel">
                    <div className="mm2-filter-group">
                        <span className="mm2-filter-label">연령</span>
                        {AGE_GROUPS.map(g => (
                            <button
                                key={g.key}
                                className={`mm2-chip ${ageFilter === g.key ? 'active' : ''}`}
                                onClick={() => setAgeFilter(ageFilter === g.key ? null : g.key)}
                            >
                                <span>{g.icon}</span> {g.label}
                            </button>
                        ))}
                    </div>
                    <div className="mm2-filter-group">
                        <span className="mm2-filter-label">성별</span>
                        <button
                            className={`mm2-chip ${genderFilter === 'male' ? 'active' : ''}`}
                            onClick={() => setGenderFilter(genderFilter === 'male' ? null : 'male')}
                        >남성</button>
                        <button
                            className={`mm2-chip ${genderFilter === 'female' ? 'active' : ''}`}
                            onClick={() => setGenderFilter(genderFilter === 'female' ? null : 'female')}
                        >여성</button>
                    </div>
                </div>
            )}

            {/* === 회원 표시 영역 === */}
            <div className="mm2-content">
                {filtered.length === 0 ? (
                    <div className="mm2-empty">
                        <div className="mm2-empty-icon">🥊</div>
                        <h3>{search ? '검색 결과가 없어요' : '회원이 없습니다'}</h3>
                        <p>{search ? '다른 키워드로 검색해보세요' : '신규 회원을 등록해보세요'}</p>
                        {!search && (
                            <button className="mm2-cta-btn" onClick={() => navigate('/admin/members/register')}>
                                <UserPlus size={16} /> 첫 회원 등록하기
                            </button>
                        )}
                    </div>
                ) : view === 'grid' ? (
                    <div className="mm2-grid">
                        {filtered.map(m => (
                            <MemberCard
                                key={m.id}
                                member={m}
                                onClick={() => fetchMemberDetail(m)}
                                isSelected={selectedMember?.id === m.id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="mm2-list">
                        {filtered.map(m => (
                            <MemberRow
                                key={m.id}
                                member={m}
                                onClick={() => fetchMemberDetail(m)}
                                isSelected={selectedMember?.id === m.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* === 우측 슬라이드 패널 (회원 상세) === */}
            {selectedMember && (
                <>
                    <div className="mm2-overlay" onClick={closePanel} />
                    <div className="mm2-side-panel">
                        <div className="mm2-panel-header">
                            <button className="mm2-panel-close" onClick={closePanel}>
                                <X size={18} />
                            </button>
                            <div className="mm2-panel-actions">
                                {!editMode && !deleteConfirm && (
                                    <>
                                        <button className="mm2-icon-btn" onClick={() => { setEditForm({ ...selectedMember }); setEditMode(true) }} title="수정">
                                            <Edit3 size={14} />
                                        </button>
                                        <button className="mm2-icon-btn danger" onClick={() => setDeleteConfirm(true)} title="삭제">
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                                {editMode && (
                                    <>
                                        <button className="mm2-icon-btn" onClick={() => setEditMode(false)}><X size={14} /></button>
                                        <button className="mm2-icon-btn primary" onClick={handleSave} disabled={saving}>
                                            <Save size={14} /> {saving ? '저장 중' : '저장'}
                                        </button>
                                    </>
                                )}
                                {deleteConfirm && (
                                    <>
                                        <button className="mm2-icon-btn" onClick={() => setDeleteConfirm(false)}>취소</button>
                                        <button className="mm2-icon-btn danger primary" onClick={handleDelete} disabled={saving}>
                                            정말 삭제
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {detailLoading ? (
                            <div className="mm2-panel-loading">
                                <div className="mm2-spinner" />
                            </div>
                        ) : (
                            <div className="mm2-panel-body">
                                {/* 프로필 */}
                                <div className="mm2-profile-section">
                                    <div
                                        className="mm2-profile-avatar"
                                        style={{ background: getAvatarColor(selectedMember.name || '') }}
                                    >
                                        {(selectedMember.name || '?').charAt(0)}
                                    </div>
                                    {editMode ? (
                                        <div className="mm2-edit-form">
                                            <input className="mm2-edit-name" value={editForm.name || ''}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                placeholder="이름" />
                                            <input className="mm2-edit-input" value={editForm.phone || ''}
                                                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                                placeholder="전화번호" />
                                            <div className="mm2-edit-row">
                                                <input className="mm2-edit-input" type="number" value={editForm.age || ''}
                                                    onChange={e => setEditForm({ ...editForm, age: e.target.value })}
                                                    placeholder="나이" />
                                                <select className="mm2-edit-input" value={editForm.gender || ''}
                                                    onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                                                    <option value="">성별</option>
                                                    <option value="male">남성</option>
                                                    <option value="female">여성</option>
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h2 className="mm2-profile-name">{selectedMember.name}</h2>
                                            <div className="mm2-profile-meta">
                                                {(() => {
                                                    const s = statusInfo(selectedMember.membershipStatus)
                                                    return <span className={`mm2-status-badge ${s.color}`}>{s.label}</span>
                                                })()}
                                                {selectedMember.age && (
                                                    <span className="mm2-meta-tag">
                                                        {getAgeGroup(selectedMember.age)?.icon} {selectedMember.age}세
                                                    </span>
                                                )}
                                                {selectedMember.gender && (
                                                    <span className="mm2-meta-tag">
                                                        {selectedMember.gender === 'male' ? '남성' : '여성'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mm2-profile-contact">
                                                <Smartphone size={14} />
                                                <span>{selectedMember.phone || '-'}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* 회원권 카드 */}
                                {selectedMember.membership && (
                                    <div className="mm2-info-card primary">
                                        <div className="mm2-info-card-row">
                                            <div className="mm2-info-card-label">
                                                <CreditCard size={14} /> 현재 회원권
                                            </div>
                                            <div className="mm2-info-card-value">{selectedMember.membership.type}</div>
                                        </div>
                                        <div className="mm2-info-card-row">
                                            <div className="mm2-info-card-label">만료일</div>
                                            <div className="mm2-info-card-value">
                                                {formatDate(selectedMember.membership.end_date)}
                                                {(() => {
                                                    const days = Math.ceil((new Date(selectedMember.membership.end_date) - new Date()) / 86400000)
                                                    if (days < 0) return <span className="mm2-days-tag danger">{Math.abs(days)}일 지남</span>
                                                    if (days <= 7) return <span className="mm2-days-tag warning">{days}일 남음</span>
                                                    return <span className="mm2-days-tag success">{days}일 남음</span>
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 빠른 통계 */}
                                {memberDetail && (
                                    <div className="mm2-quick-stats">
                                        <div className="mm2-qs-item">
                                            <Activity size={14} className="mm2-qs-icon" />
                                            <div className="mm2-qs-value">{memberDetail.thisMonthCount}</div>
                                            <div className="mm2-qs-label">이번달 출석</div>
                                        </div>
                                        <div className="mm2-qs-item">
                                            <TrendingUp size={14} className="mm2-qs-icon" />
                                            <div className="mm2-qs-value">{memberDetail.totalSessions}</div>
                                            <div className="mm2-qs-label">총 세션</div>
                                        </div>
                                        <div className="mm2-qs-item">
                                            <Clock size={14} className="mm2-qs-icon" />
                                            <div className="mm2-qs-value">{memberDetail.totalHours}<span>h</span></div>
                                            <div className="mm2-qs-label">총 운동시간</div>
                                        </div>
                                    </div>
                                )}

                                {/* 락커 */}
                                <div className="mm2-info-card">
                                    <div className="mm2-info-card-row">
                                        <div className="mm2-info-card-label">
                                            <Key size={14} /> 락커
                                        </div>
                                        {lockerEdit ? (
                                            <div className="mm2-locker-edit">
                                                <input
                                                    className="mm2-edit-input small"
                                                    value={lockerNumber}
                                                    onChange={e => setLockerNumber(e.target.value)}
                                                    placeholder="번호"
                                                />
                                                <button className="mm2-icon-btn primary" onClick={handleLockerSave}>
                                                    <Save size={12} />
                                                </button>
                                                <button className="mm2-icon-btn" onClick={() => setLockerEdit(false)}>
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mm2-info-card-value">
                                                {selectedMember.locker_number || '미배정'}
                                                <button className="mm2-icon-btn-mini" onClick={() => setLockerEdit(true)}>
                                                    <Edit3 size={11} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 코치 노트 */}
                                <div className="mm2-section">
                                    <div className="mm2-section-title">
                                        <MessageSquare size={14} /> 코치 메모
                                    </div>
                                    <div className="mm2-note-add">
                                        <textarea
                                            className="mm2-note-input"
                                            placeholder="회원에 대한 메모를 남기세요..."
                                            value={noteText}
                                            onChange={e => setNoteText(e.target.value)}
                                            rows={2}
                                        />
                                        <button className="mm2-note-btn" onClick={handleAddNote} disabled={!noteText.trim()}>
                                            추가
                                        </button>
                                    </div>
                                    {memberDetail?.notes?.length > 0 && (
                                        <div className="mm2-notes-list">
                                            {memberDetail.notes.map(n => (
                                                <div key={n.id} className="mm2-note-item">
                                                    <p>{n.content}</p>
                                                    <span className="mm2-note-date">{formatDateTime(n.created_at)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 활동 타임라인 */}
                                {memberDetail?.attendance?.length > 0 && (
                                    <div className="mm2-section">
                                        <div className="mm2-section-title">
                                            <Activity size={14} /> 최근 활동
                                        </div>
                                        <div className="mm2-timeline">
                                            {memberDetail.attendance.slice(0, 8).map(a => {
                                                const isExit = a.qr_data?.startsWith('exit-')
                                                return (
                                                    <div key={a.id} className="mm2-timeline-item">
                                                        <div className={`mm2-timeline-dot ${isExit ? 'exit' : 'entry'}`} />
                                                        <div>
                                                            <div className="mm2-timeline-title">
                                                                {isExit ? '체육관 퇴장' : '체육관 입장'}
                                                            </div>
                                                            <div className="mm2-timeline-time">{formatDateTime(a.checked_at)}</div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 결제 내역 */}
                                {memberDetail?.payments?.length > 0 && (
                                    <div className="mm2-section">
                                        <div className="mm2-section-title">
                                            <CreditCard size={14} /> 결제 내역
                                        </div>
                                        <div className="mm2-payment-list">
                                            {memberDetail.payments.slice(0, 5).map(p => (
                                                <div key={p.id} className="mm2-payment-item">
                                                    <div>
                                                        <div className="mm2-payment-name">{p.item}</div>
                                                        <div className="mm2-payment-date">{formatDate(p.paid_at)}</div>
                                                    </div>
                                                    <div className="mm2-payment-amount">
                                                        {(p.amount || 0).toLocaleString()}<span>원</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

// === 통계 카드 컴포넌트 ===
function StatCard({ icon, iconColor, label, value, unit, sub }) {
    return (
        <div className="mm2-stat-card">
            <div className="mm2-stat-header">
                <span className="mm2-stat-label">{label}</span>
                <div className={`mm2-stat-icon ${iconColor}`}>{icon}</div>
            </div>
            <div className="mm2-stat-value">
                {value}{unit && <span className="mm2-stat-unit">{unit}</span>}
            </div>
            {sub && <div className="mm2-stat-sub">{sub}</div>}
        </div>
    )
}

// === 회원 카드 (그리드 뷰) ===
function MemberCard({ member, onClick, isSelected }) {
    const status = statusInfo(member.membershipStatus)
    const ageGroup = getAgeGroup(member.age)
    const isOnSite = member.lastVisit && (new Date() - new Date(member.lastVisit)) < 3600000
    const maxHeat = Math.max(1, ...member.heatmap)

    return (
        <button
            className={`mm2-card ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
        >
            <div className="mm2-card-top">
                <div className="mm2-card-avatar-wrap">
                    <div
                        className="mm2-card-avatar"
                        style={{ background: getAvatarColor(member.name || '') }}
                    >
                        {(member.name || '?').charAt(0)}
                    </div>
                    {isOnSite && <span className="mm2-card-status-dot" />}
                </div>
                <span className={`mm2-card-status ${status.color}`}>{status.label}</span>
            </div>

            <div className="mm2-card-name">{member.name || '이름 없음'}</div>

            <div className="mm2-card-tags">
                {ageGroup && (
                    <span className="mm2-card-tag">
                        {ageGroup.icon} {ageGroup.label}
                    </span>
                )}
                {member.gender && (
                    <span className="mm2-card-tag">
                        {member.gender === 'male' ? '남' : '여'}
                    </span>
                )}
                {member.locker_number && (
                    <span className="mm2-card-tag">
                        🔑 {member.locker_number}
                    </span>
                )}
            </div>

            {/* 7일 출석 히트맵 */}
            <div className="mm2-card-heatmap">
                <div className="mm2-card-heatmap-label">최근 7일 출석</div>
                <div className="mm2-card-heatmap-bars">
                    {member.heatmap.map((count, i) => (
                        <div
                            key={i}
                            className={`mm2-heat-cell ${count > 0 ? 'active' : ''}`}
                            style={{ opacity: count > 0 ? 0.4 + (count / maxHeat) * 0.6 : 0.15 }}
                            title={count > 0 ? `${count}회 출석` : '미출석'}
                        />
                    ))}
                </div>
            </div>

            <div className="mm2-card-footer">
                {member.lastVisit ? (
                    <span className="mm2-card-time">
                        {isOnSite ? '🟢 운동 중' : `${timeAgo(member.lastVisit)} 방문`}
                    </span>
                ) : (
                    <span className="mm2-card-time muted">방문 기록 없음</span>
                )}
            </div>
        </button>
    )
}

// === 회원 행 (리스트 뷰) ===
function MemberRow({ member, onClick, isSelected }) {
    const status = statusInfo(member.membershipStatus)
    const ageGroup = getAgeGroup(member.age)
    const isOnSite = member.lastVisit && (new Date() - new Date(member.lastVisit)) < 3600000
    const maxHeat = Math.max(1, ...member.heatmap)

    return (
        <button
            className={`mm2-row ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
        >
            <div className="mm2-row-avatar-wrap">
                <div
                    className="mm2-row-avatar"
                    style={{ background: getAvatarColor(member.name || '') }}
                >
                    {(member.name || '?').charAt(0)}
                </div>
                {isOnSite && <span className="mm2-card-status-dot" />}
            </div>
            <div className="mm2-row-info">
                <div className="mm2-row-name">{member.name}</div>
                <div className="mm2-row-meta">
                    {ageGroup && <span>{ageGroup.label}</span>}
                    {member.gender && <span>{member.gender === 'male' ? '남' : '여'}</span>}
                    {member.phone && <span>{member.phone}</span>}
                </div>
            </div>
            <div className="mm2-row-heatmap">
                {member.heatmap.map((count, i) => (
                    <div
                        key={i}
                        className={`mm2-heat-cell mini ${count > 0 ? 'active' : ''}`}
                        style={{ opacity: count > 0 ? 0.4 + (count / maxHeat) * 0.6 : 0.15 }}
                    />
                ))}
            </div>
            <span className={`mm2-card-status ${status.color}`}>{status.label}</span>
            <div className="mm2-row-time">
                {isOnSite ? <span className="mm2-onsite">운동 중</span> : member.lastVisit ? timeAgo(member.lastVisit) : '-'}
            </div>
        </button>
    )
}
