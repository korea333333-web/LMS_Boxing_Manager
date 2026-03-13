import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const AVATAR_COLORS = ['#E53E3E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
function getAvatarColor(name) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function MemberManagement() {
    const navigate = useNavigate()
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selectedMember, setSelectedMember] = useState(null)
    const [memberDetail, setMemberDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [editForm, setEditForm] = useState({})
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(false)

    useEffect(() => {
        fetchMembers()
    }, [])

    async function fetchMembers() {
        try {
            // 회원 + 가장 최근 회원권 조인
            const { data: membersData, error } = await supabase
                .from('members')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            // 각 회원의 회원권 + 최근 출석 가져오기
            const enriched = await Promise.all((membersData || []).map(async (m) => {
                // 최신 회원권
                const { data: membership } = await supabase
                    .from('memberships')
                    .select('*')
                    .eq('member_id', m.id)
                    .order('end_date', { ascending: false })
                    .limit(1)
                    .single()

                // 최근 출석
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

        try {
            // 출석 기록 (최근 20건)
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('*')
                .eq('member_id', member.id)
                .order('checked_at', { ascending: false })
                .limit(20)

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

            setMemberDetail({
                attendance: attendanceData || [],
                memberships: membershipData || [],
                payments: paymentData || [],
            })
        } catch (err) {
            console.error('Detail fetch error:', err)
            setMemberDetail({ attendance: [], memberships: [], payments: [] })
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
            fetchMembers()
            // 업데이트된 정보로 상세 모달도 갱신
            setSelectedMember(prev => ({ ...prev, ...editForm, age: Number(editForm.age) }))
        } catch (err) {
            console.error('Update error:', err)
            alert('수정 중 오류가 발생했습니다')
        } finally {
            setSaving(false)
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

    // 필터링
    const filtered = members.filter(m => {
        const matchSearch = search === '' ||
            m.name?.toLowerCase().includes(search.toLowerCase()) ||
            m.phone?.includes(search)
        const matchStatus = statusFilter === 'all' || m.membershipStatus === statusFilter
        return matchSearch && matchStatus
    })

    const statusLabel = (s) => {
        switch (s) {
            case 'active': return '활성'
            case 'expiring_soon': return '만료 임박'
            case 'expired': return '만료'
            default: return '미등록'
        }
    }

    const statusClass = (s) => {
        switch (s) {
            case 'active': return 'mem-status-active'
            case 'expiring_soon': return 'mem-status-warning'
            case 'expired': return 'mem-status-expired'
            default: return 'mem-status-none'
        }
    }

    const formatDate = (d) => {
        if (!d) return '-'
        const date = new Date(d)
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }

    const formatDateTime = (d) => {
        if (!d) return '-'
        const date = new Date(d)
        return date.toLocaleString('ko-KR', {
            month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: true
        })
    }

    if (loading) {
        return (
            <div className="admin-page-placeholder">
                <h2>로딩 중...</h2>
            </div>
        )
    }

    return (
        <div className="mem-page">
            {/* 헤더 */}
            <div className="mem-header">
                <div className="mem-header-left">
                    <h1 className="mem-title">👥 회원 관리</h1>
                    <span className="mem-count">총 {members.length}명</span>
                </div>
                <button
                    className="mem-add-btn"
                    onClick={() => navigate('/admin/members/register')}
                >
                    ➕ 신규 등록
                </button>
            </div>

            {/* 검색 & 필터 */}
            <div className="mem-toolbar">
                <div className="mem-search">
                    <span className="mem-search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="이름 또는 전화번호로 검색..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="mem-filters">
                    {['all', 'active', 'expiring_soon', 'expired', 'none'].map(f => (
                        <button
                            key={f}
                            className={`mem-filter-btn ${statusFilter === f ? 'active' : ''}`}
                            onClick={() => setStatusFilter(f)}
                        >
                            {f === 'all' ? '전체' : statusLabel(f)}
                        </button>
                    ))}
                </div>
            </div>

            {/* 테이블 */}
            <div className="mem-table-wrap">
                <table className="mem-table">
                    <thead>
                        <tr>
                            <th>회원명</th>
                            <th>전화번호</th>
                            <th>나이</th>
                            <th>성별</th>
                            <th>회원권 상태</th>
                            <th>최근 출석</th>
                            <th style={{ textAlign: 'right' }}>상세</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((m) => (
                            <tr key={m.id} onClick={() => fetchMemberDetail(m)} className="mem-row">
                                <td>
                                    <div className="mem-name-cell">
                                        <div
                                            className="mem-avatar"
                                            style={{ background: getAvatarColor(m.name || '') }}
                                        >
                                            {(m.name || '?').charAt(0)}
                                        </div>
                                        <span className="mem-name">{m.name}</span>
                                    </div>
                                </td>
                                <td>{m.phone || '-'}</td>
                                <td>{m.age || '-'}</td>
                                <td>{m.gender === 'male' ? '남' : m.gender === 'female' ? '여' : '-'}</td>
                                <td>
                                    <span className={`mem-status-badge ${statusClass(m.membershipStatus)}`}>
                                        {statusLabel(m.membershipStatus)}
                                    </span>
                                </td>
                                <td>{formatDate(m.lastVisit)}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="mem-detail-btn">보기 →</button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', color: '#666', padding: 40 }}>
                                    {search ? '검색 결과가 없습니다' : '등록된 회원이 없습니다'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 회원 상세 모달 */}
            {selectedMember && (
                <div className="mem-modal-overlay" onClick={() => { setSelectedMember(null); setMemberDetail(null) }}>
                    <div className="mem-modal" onClick={e => e.stopPropagation()}>
                        {/* 모달 헤더 */}
                        <div className="mem-modal-header">
                            <div className="mem-modal-profile">
                                <div
                                    className="mem-modal-avatar"
                                    style={{ background: getAvatarColor(selectedMember.name || '') }}
                                >
                                    {(selectedMember.name || '?').charAt(0)}
                                </div>
                                <div>
                                    {editMode ? (
                                        <input
                                            className="mem-edit-input"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        />
                                    ) : (
                                        <h2 className="mem-modal-name">{selectedMember.name}</h2>
                                    )}
                                    <span className={`mem-status-badge ${statusClass(selectedMember.membershipStatus)}`}>
                                        {statusLabel(selectedMember.membershipStatus)}
                                    </span>
                                </div>
                            </div>
                            <button
                                className="mem-modal-close"
                                onClick={() => { setSelectedMember(null); setMemberDetail(null) }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 기본 정보 */}
                        <div className="mem-modal-info-grid">
                            <div className="mem-modal-info-item">
                                <span className="mem-modal-info-label">📱 전화번호</span>
                                {editMode ? (
                                    <input
                                        className="mem-edit-input"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                ) : (
                                    <span className="mem-modal-info-value">{selectedMember.phone || '-'}</span>
                                )}
                            </div>
                            <div className="mem-modal-info-item">
                                <span className="mem-modal-info-label">🎂 나이</span>
                                {editMode ? (
                                    <input
                                        className="mem-edit-input"
                                        type="number"
                                        value={editForm.age}
                                        onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                                    />
                                ) : (
                                    <span className="mem-modal-info-value">{selectedMember.age || '-'}세</span>
                                )}
                            </div>
                            <div className="mem-modal-info-item">
                                <span className="mem-modal-info-label">⚧ 성별</span>
                                {editMode ? (
                                    <div className="mem-edit-gender">
                                        <button
                                            className={`mem-edit-gender-btn ${editForm.gender === 'male' ? 'active' : ''}`}
                                            onClick={() => setEditForm({ ...editForm, gender: 'male' })}
                                        >남</button>
                                        <button
                                            className={`mem-edit-gender-btn ${editForm.gender === 'female' ? 'active' : ''}`}
                                            onClick={() => setEditForm({ ...editForm, gender: 'female' })}
                                        >여</button>
                                    </div>
                                ) : (
                                    <span className="mem-modal-info-value">
                                        {selectedMember.gender === 'male' ? '남성' : selectedMember.gender === 'female' ? '여성' : '-'}
                                    </span>
                                )}
                            </div>
                            <div className="mem-modal-info-item">
                                <span className="mem-modal-info-label">📅 가입일</span>
                                <span className="mem-modal-info-value">{formatDate(selectedMember.created_at)}</span>
                            </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="mem-modal-actions">
                            {editMode ? (
                                <>
                                    <button className="mem-action-save" onClick={handleSave} disabled={saving}>
                                        {saving ? '저장 중...' : '💾 저장'}
                                    </button>
                                    <button className="mem-action-cancel" onClick={() => setEditMode(false)}>
                                        취소
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="mem-action-edit"
                                        onClick={() => {
                                            setEditForm({
                                                name: selectedMember.name || '',
                                                phone: selectedMember.phone || '',
                                                age: selectedMember.age || '',
                                                gender: selectedMember.gender || '',
                                            })
                                            setEditMode(true)
                                        }}
                                    >
                                        ✏️ 수정
                                    </button>
                                    {deleteConfirm ? (
                                        <div className="mem-delete-confirm">
                                            <span>정말 삭제하시겠습니까?</span>
                                            <button className="mem-action-delete-yes" onClick={handleDelete} disabled={saving}>
                                                {saving ? '삭제 중...' : '삭제'}
                                            </button>
                                            <button className="mem-action-cancel" onClick={() => setDeleteConfirm(false)}>
                                                취소
                                            </button>
                                        </div>
                                    ) : (
                                        <button className="mem-action-delete" onClick={() => setDeleteConfirm(true)}>
                                            🗑️ 삭제
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* 상세 탭 내용 */}
                        {detailLoading ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>로딩 중...</div>
                        ) : memberDetail && (
                            <div className="mem-modal-tabs">
                                {/* 출석 기록 */}
                                <div className="mem-detail-section">
                                    <h3 className="mem-detail-title">📋 출석 기록 (최근 20건)</h3>
                                    {memberDetail.attendance.length > 0 ? (
                                        <div className="mem-detail-list">
                                            {memberDetail.attendance.map((a, i) => {
                                                const isExit = a.qr_data && a.qr_data.startsWith('exit-')
                                                return (
                                                    <div key={i} className="mem-detail-item">
                                                        <span className={`mem-detail-badge ${isExit ? 'exit' : 'entry'}`}>
                                                            {isExit ? '퇴장' : '입장'}
                                                        </span>
                                                        <span className="mem-detail-date">{formatDateTime(a.checked_at)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <p className="mem-detail-empty">출석 기록이 없습니다</p>
                                    )}
                                </div>

                                {/* 회원권 내역 */}
                                <div className="mem-detail-section">
                                    <h3 className="mem-detail-title">💳 회원권 내역</h3>
                                    {memberDetail.memberships.length > 0 ? (
                                        <div className="mem-detail-list">
                                            {memberDetail.memberships.map((ms, i) => {
                                                const endDate = new Date(ms.end_date)
                                                const isExpired = endDate < new Date()
                                                return (
                                                    <div key={i} className="mem-detail-item membership">
                                                        <div>
                                                            <span className="mem-detail-type">{ms.type}</span>
                                                            <span className={`mem-detail-badge ${isExpired ? 'exit' : 'entry'}`}>
                                                                {isExpired ? '만료' : '활성'}
                                                            </span>
                                                        </div>
                                                        <span className="mem-detail-date">
                                                            {formatDate(ms.start_date)} ~ {formatDate(ms.end_date)}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <p className="mem-detail-empty">회원권 기록이 없습니다</p>
                                    )}
                                </div>

                                {/* 결제 내역 */}
                                <div className="mem-detail-section">
                                    <h3 className="mem-detail-title">💰 결제 내역</h3>
                                    {memberDetail.payments.length > 0 ? (
                                        <div className="mem-detail-list">
                                            {memberDetail.payments.map((p, i) => (
                                                <div key={i} className="mem-detail-item payment">
                                                    <div>
                                                        <span className="mem-detail-type">{p.item}</span>
                                                        <span className="mem-detail-method">
                                                            {p.method === 'card' ? '💳 카드' : p.method === 'cash' ? '💵 현금' : '🏦 계좌이체'}
                                                        </span>
                                                    </div>
                                                    <div className="mem-detail-payment-right">
                                                        <span className="mem-detail-amount">{(p.amount || 0).toLocaleString()}원</span>
                                                        <span className="mem-detail-date">{formatDate(p.paid_at)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mem-detail-empty">결제 기록이 없습니다</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
