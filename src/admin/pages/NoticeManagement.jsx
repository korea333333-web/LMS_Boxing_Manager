import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const AGE_GROUPS = [
    { key: 'elementary', label: '초등', icon: '🧒', range: [7, 12] },
    { key: 'middle', label: '중등', icon: '📚', range: [13, 15] },
    { key: 'high', label: '고등', icon: '🎓', range: [16, 18] },
    { key: 'adult', label: '성인', icon: '👤', range: [19, 999] },
]

const GENDER_OPTIONS = [
    { key: 'male', label: '남성', icon: '♂️' },
    { key: 'female', label: '여성', icon: '♀️' },
]

const STATUS_OPTIONS = [
    { key: 'active', label: '활성', icon: '✅' },
    { key: 'expiring_soon', label: '만료 임박', icon: '⚠️' },
    { key: 'expired', label: '만료', icon: '❌' },
]

const PRIORITY_OPTIONS = [
    { key: 'normal', label: '일반', color: '#3B82F6' },
    { key: 'important', label: '중요', color: '#F59E0B' },
    { key: 'urgent', label: '긴급', color: '#E53E3E' },
]

function timeAgo(dateStr) {
    const now = new Date()
    const then = new Date(dateStr)
    const diffMs = now - then
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffHour < 24) return `${diffHour}시간 전`
    if (diffDay < 7) return `${diffDay}일 전`
    return then.toLocaleDateString('ko-KR')
}

export default function NoticeManagement() {
    const [notices, setNotices] = useState([])
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        title: '',
        content: '',
        priority: 'normal',
        target_age: [],
        target_gender: [],
        target_status: [],
    })
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [selectedNotice, setSelectedNotice] = useState(null)
    const [readStats, setReadStats] = useState({})

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            const [{ data: noticesData }, { data: membersData }] = await Promise.all([
                supabase
                    .from('notices')
                    .select('*, admin_users(name)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('members')
                    .select('id, name, age, gender')
            ])

            setNotices(noticesData || [])
            setMembers(membersData || [])

            // 각 공지별 읽음 수 가져오기
            if (noticesData && noticesData.length > 0) {
                const stats = {}
                for (const notice of noticesData) {
                    const { count } = await supabase
                        .from('notice_reads')
                        .select('*', { count: 'exact', head: true })
                        .eq('notice_id', notice.id)
                    stats[notice.id] = count || 0
                }
                setReadStats(stats)
            }
        } catch (err) {
            console.error('데이터 로딩 에러:', err)
        } finally {
            setLoading(false)
        }
    }

    // 필터 조건에 맞는 회원 수 계산
    function getTargetCount() {
        return members.filter(m => {
            // 연령 필터
            if (form.target_age.length > 0) {
                const memberAge = m.age || 0
                const matchesAge = form.target_age.some(ageKey => {
                    const group = AGE_GROUPS.find(g => g.key === ageKey)
                    return group && memberAge >= group.range[0] && memberAge <= group.range[1]
                })
                if (!matchesAge) return false
            }
            // 성별 필터
            if (form.target_gender.length > 0) {
                if (!form.target_gender.includes(m.gender)) return false
            }
            return true
        }).length
    }

    function toggleArrayItem(arr, item) {
        return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]
    }

    function openNewForm() {
        setForm({
            title: '',
            content: '',
            priority: 'normal',
            target_age: [],
            target_gender: [],
            target_status: [],
        })
        setShowForm(true)
    }

    async function handleSave() {
        if (!form.title.trim() || !form.content.trim()) return
        setSaving(true)
        try {
            const session = JSON.parse(localStorage.getItem('admin_session'))
            const targetCount = getTargetCount()

            const { error } = await supabase.from('notices').insert({
                title: form.title.trim(),
                content: form.content.trim(),
                priority: form.priority,
                target_age: form.target_age,
                target_gender: form.target_gender,
                target_status: form.target_status,
                target_count: targetCount,
                created_by: session?.id || null,
            })
            if (error) throw error
            setShowForm(false)
            fetchData()
        } catch (err) {
            console.error('저장 에러:', err)
            alert('저장에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id) {
        try {
            const { error } = await supabase.from('notices').delete().eq('id', id)
            if (error) throw error
            setDeleteConfirm(null)
            setSelectedNotice(null)
            fetchData()
        } catch (err) {
            console.error('삭제 에러:', err)
        }
    }

    function getTargetSummary(notice) {
        const parts = []
        if (notice.target_age?.length > 0) {
            parts.push(notice.target_age.map(k => AGE_GROUPS.find(g => g.key === k)?.label).filter(Boolean).join(', '))
        }
        if (notice.target_gender?.length > 0) {
            parts.push(notice.target_gender.map(k => GENDER_OPTIONS.find(g => g.key === k)?.label).filter(Boolean).join(', '))
        }
        if (notice.target_status?.length > 0) {
            parts.push(notice.target_status.map(k => STATUS_OPTIONS.find(g => g.key === k)?.label).filter(Boolean).join(', '))
        }
        return parts.length > 0 ? parts.join(' · ') : '전체 회원'
    }

    if (loading) {
        return <div className="admin-page-placeholder"><h2>로딩 중...</h2></div>
    }

    const targetCount = getTargetCount()

    return (
        <div className="nt-page">
            {/* 헤더 */}
            <div className="nt-header">
                <div className="nt-header-left">
                    <h1 className="nt-title">📢 공지 / 메시지</h1>
                    <span className="nt-count">총 {notices.length}건</span>
                </div>
                <button className="nt-add-btn" onClick={openNewForm}>
                    + 새 공지 작성
                </button>
            </div>

            {/* 요약 카드 */}
            <div className="nt-summary-row">
                <div className="nt-summary-card">
                    <div className="nt-summary-icon">📨</div>
                    <div>
                        <div className="nt-summary-value">{notices.length}</div>
                        <div className="nt-summary-label">전체 공지</div>
                    </div>
                </div>
                <div className="nt-summary-card">
                    <div className="nt-summary-icon">🔴</div>
                    <div>
                        <div className="nt-summary-value">
                            {notices.filter(n => n.priority === 'urgent').length}
                        </div>
                        <div className="nt-summary-label">긴급 공지</div>
                    </div>
                </div>
                <div className="nt-summary-card">
                    <div className="nt-summary-icon">👥</div>
                    <div>
                        <div className="nt-summary-value">{members.length}</div>
                        <div className="nt-summary-label">전체 회원</div>
                    </div>
                </div>
            </div>

            {/* 공지 목록 */}
            <div className="nt-list-area">
                <div className="nt-list">
                    {notices.length === 0 ? (
                        <div className="nt-empty">
                            <span className="nt-empty-icon">📢</span>
                            <p>아직 작성된 공지가 없습니다</p>
                            <button className="nt-empty-btn" onClick={openNewForm}>첫 공지 작성하기</button>
                        </div>
                    ) : (
                        notices.map(notice => {
                            const pOpt = PRIORITY_OPTIONS.find(p => p.key === notice.priority)
                            const isSelected = selectedNotice?.id === notice.id
                            return (
                                <div
                                    key={notice.id}
                                    className={`nt-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedNotice(notice)}
                                >
                                    <div className="nt-card-top">
                                        <span
                                            className="nt-priority-dot"
                                            style={{ background: pOpt?.color }}
                                            title={pOpt?.label}
                                        />
                                        <span className="nt-card-title">{notice.title}</span>
                                        <span className="nt-card-time">{timeAgo(notice.created_at)}</span>
                                    </div>
                                    <div className="nt-card-bottom">
                                        <span className="nt-card-target">
                                            🎯 {getTargetSummary(notice)}
                                        </span>
                                        <span className="nt-card-read">
                                            👁️ {readStats[notice.id] || 0}/{notice.target_count || members.length}
                                        </span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* 상세 보기 패널 */}
                {selectedNotice && (
                    <div className="nt-detail">
                        <div className="nt-detail-header">
                            <div>
                                <span
                                    className="nt-priority-badge"
                                    style={{ background: PRIORITY_OPTIONS.find(p => p.key === selectedNotice.priority)?.color }}
                                >
                                    {PRIORITY_OPTIONS.find(p => p.key === selectedNotice.priority)?.label}
                                </span>
                                <h2 className="nt-detail-title">{selectedNotice.title}</h2>
                            </div>
                            <button className="nt-detail-close" onClick={() => setSelectedNotice(null)}>✕</button>
                        </div>

                        <div className="nt-detail-meta">
                            <span>✍️ {selectedNotice.admin_users?.name || '관리자'}</span>
                            <span>📅 {new Date(selectedNotice.created_at).toLocaleDateString('ko-KR')}</span>
                            <span>🎯 {getTargetSummary(selectedNotice)}</span>
                            <span>👁️ 읽음 {readStats[selectedNotice.id] || 0}/{selectedNotice.target_count || members.length}명</span>
                        </div>

                        <div className="nt-detail-content">
                            {selectedNotice.content.split('\n').map((line, i) => (
                                <p key={i}>{line || '\u00A0'}</p>
                            ))}
                        </div>

                        <div className="nt-detail-actions">
                            {deleteConfirm === selectedNotice.id ? (
                                <div className="nt-delete-confirm">
                                    <span>정말 삭제하시겠습니까?</span>
                                    <button className="nt-action-btn delete" onClick={() => handleDelete(selectedNotice.id)}>삭제</button>
                                    <button className="nt-action-btn cancel" onClick={() => setDeleteConfirm(null)}>취소</button>
                                </div>
                            ) : (
                                <button className="nt-action-btn delete" onClick={() => setDeleteConfirm(selectedNotice.id)}>
                                    🗑️ 삭제
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 작성 모달 */}
            {showForm && (
                <div className="nt-modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="nt-modal" onClick={e => e.stopPropagation()}>
                        <div className="nt-modal-header">
                            <h2>📢 새 공지 작성</h2>
                            <button className="nt-modal-close" onClick={() => setShowForm(false)}>✕</button>
                        </div>
                        <div className="nt-modal-body">
                            {/* 우선순위 */}
                            <div className="nt-form-group">
                                <label className="nt-form-label">우선순위</label>
                                <div className="nt-form-chips">
                                    {PRIORITY_OPTIONS.map(p => (
                                        <button
                                            key={p.key}
                                            className={`nt-form-chip ${form.priority === p.key ? 'active' : ''}`}
                                            style={form.priority === p.key ? { borderColor: p.color, color: p.color } : {}}
                                            onClick={() => setForm({ ...form, priority: p.key })}
                                        >
                                            <span className="nt-chip-dot" style={{ background: p.color }} />
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 제목 */}
                            <div className="nt-form-group">
                                <label className="nt-form-label">제목</label>
                                <input
                                    type="text"
                                    className="nt-form-input"
                                    placeholder="공지 제목을 입력하세요"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    maxLength={100}
                                />
                            </div>

                            {/* 내용 */}
                            <div className="nt-form-group">
                                <label className="nt-form-label">내용</label>
                                <textarea
                                    className="nt-form-textarea"
                                    placeholder="공지 내용을 입력하세요"
                                    value={form.content}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                    rows={6}
                                />
                            </div>

                            {/* 수신 대상 필터 */}
                            <div className="nt-form-group">
                                <label className="nt-form-label">🎯 수신 대상</label>
                                <div className="nt-target-section">
                                    <div className="nt-target-row">
                                        <span className="nt-target-label">연령대</span>
                                        <div className="nt-form-chips">
                                            {AGE_GROUPS.map(g => (
                                                <button
                                                    key={g.key}
                                                    className={`nt-form-chip ${form.target_age.includes(g.key) ? 'active' : ''}`}
                                                    onClick={() => setForm({ ...form, target_age: toggleArrayItem(form.target_age, g.key) })}
                                                >
                                                    {g.icon} {g.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="nt-target-row">
                                        <span className="nt-target-label">성별</span>
                                        <div className="nt-form-chips">
                                            {GENDER_OPTIONS.map(g => (
                                                <button
                                                    key={g.key}
                                                    className={`nt-form-chip ${form.target_gender.includes(g.key) ? 'active' : ''}`}
                                                    onClick={() => setForm({ ...form, target_gender: toggleArrayItem(form.target_gender, g.key) })}
                                                >
                                                    {g.icon} {g.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="nt-target-row">
                                        <span className="nt-target-label">회원 상태</span>
                                        <div className="nt-form-chips">
                                            {STATUS_OPTIONS.map(s => (
                                                <button
                                                    key={s.key}
                                                    className={`nt-form-chip ${form.target_status.includes(s.key) ? 'active' : ''}`}
                                                    onClick={() => setForm({ ...form, target_status: toggleArrayItem(form.target_status, s.key) })}
                                                >
                                                    {s.icon} {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 대상 인원 미리보기 */}
                            <div className="nt-target-preview">
                                <span className="nt-target-preview-icon">👥</span>
                                <span className="nt-target-preview-text">
                                    {form.target_age.length === 0 && form.target_gender.length === 0 && form.target_status.length === 0
                                        ? `전체 회원 ${members.length}명에게 발송`
                                        : `선택된 조건에 해당하는 ${targetCount}명에게 발송`
                                    }
                                </span>
                            </div>
                        </div>

                        <div className="nt-modal-footer">
                            <button className="nt-btn-cancel" onClick={() => setShowForm(false)}>취소</button>
                            <button
                                className="nt-btn-save"
                                onClick={handleSave}
                                disabled={saving || !form.title.trim() || !form.content.trim()}
                            >
                                {saving ? '발송 중...' : '공지 발송'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
