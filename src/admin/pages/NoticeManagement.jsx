import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
    Plus, X, Send, Pin, Trash2, Eye, Users, AlertTriangle,
    Megaphone, Calendar, Filter, ChevronDown,
} from 'lucide-react'

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
    { key: 'urgent', label: '긴급', color: 'var(--danger)', emoji: '🚨' },
    { key: 'important', label: '중요', color: 'var(--warning)', emoji: '⚠️' },
    { key: 'normal', label: '일반', color: 'var(--info)', emoji: '📢' },
]

function formatDateGroup(dateStr) {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(date)
    target.setHours(0, 0, 0, 0)
    const diff = Math.floor((today - target) / 86400000)
    if (diff === 0) return '오늘'
    if (diff === 1) return '어제'
    if (diff < 7) return `${diff}일 전`
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function timeAgo(dateStr) {
    const now = new Date()
    const then = new Date(dateStr)
    const diffMin = Math.floor((now - then) / 60000)
    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}시간 전`
    const diffDay = Math.floor(diffHour / 24)
    if (diffDay < 7) return `${diffDay}일 전`
    return then.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function NoticeManagement() {
    const [notices, setNotices] = useState([])
    const [members, setMembers] = useState([])
    const [readStats, setReadStats] = useState({})
    const [loading, setLoading] = useState(true)
    const [filterPriority, setFilterPriority] = useState('all') // all | urgent | important | normal
    const [searchQuery, setSearchQuery] = useState('')

    // 작성 모달
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        title: '', content: '', priority: 'normal',
        target_age: [], target_gender: [], target_status: [],
    })
    const [saving, setSaving] = useState(false)

    // 상세 보기
    const [selectedNotice, setSelectedNotice] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    useEffect(() => { fetchData() }, [])

    async function fetchData() {
        try {
            const [{ data: noticesData }, { data: membersData }] = await Promise.all([
                supabase.from('notices').select('*, admin_users(name)').order('created_at', { ascending: false }),
                supabase.from('members').select('id, name, age, gender'),
            ])
            setNotices(noticesData || [])
            setMembers(membersData || [])

            // 읽음 통계
            if (noticesData && noticesData.length > 0) {
                const stats = {}
                for (const n of noticesData) {
                    const { count } = await supabase
                        .from('notice_reads')
                        .select('*', { count: 'exact', head: true })
                        .eq('notice_id', n.id)
                    stats[n.id] = count || 0
                }
                setReadStats(stats)
            }
        } catch (err) {
            console.error('데이터 로딩 에러:', err)
        } finally {
            setLoading(false)
        }
    }

    // 대상 인원 계산
    function getTargetCount() {
        return members.filter(m => {
            if (form.target_age.length > 0) {
                const a = m.age || 0
                const ok = form.target_age.some(k => {
                    const g = AGE_GROUPS.find(g => g.key === k)
                    return g && a >= g.range[0] && a <= g.range[1]
                })
                if (!ok) return false
            }
            if (form.target_gender.length > 0 && !form.target_gender.includes(m.gender)) return false
            return true
        }).length
    }

    function toggleArrayItem(arr, item) {
        return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]
    }

    function getTargetSummary(notice) {
        const parts = []
        if (notice.target_age?.length > 0) {
            parts.push(notice.target_age.map(k => AGE_GROUPS.find(g => g.key === k)?.label).filter(Boolean).join('·'))
        }
        if (notice.target_gender?.length > 0) {
            parts.push(notice.target_gender.map(k => GENDER_OPTIONS.find(g => g.key === k)?.label).filter(Boolean).join('·'))
        }
        if (notice.target_status?.length > 0) {
            parts.push(notice.target_status.map(k => STATUS_OPTIONS.find(g => g.key === k)?.label).filter(Boolean).join('·'))
        }
        return parts.length > 0 ? parts.join(' · ') : '전체 회원'
    }

    function openNewForm() {
        setForm({
            title: '', content: '', priority: 'normal',
            target_age: [], target_gender: [], target_status: [],
        })
        setShowForm(true)
    }

    async function handleSave() {
        if (!form.title.trim() || !form.content.trim()) return
        setSaving(true)
        try {
            const session = JSON.parse(localStorage.getItem('admin_session') || '{}')
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
            console.error(err); alert('발송 실패')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id) {
        try {
            await supabase.from('notices').delete().eq('id', id)
            setDeleteConfirm(null)
            setSelectedNotice(null)
            fetchData()
        } catch (err) { console.error(err) }
    }

    // 필터링
    const filteredNotices = useMemo(() => {
        return notices.filter(n => {
            const matchPrio = filterPriority === 'all' || n.priority === filterPriority
            const matchSearch = !searchQuery ||
                n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.content.toLowerCase().includes(searchQuery.toLowerCase())
            return matchPrio && matchSearch
        })
    }, [notices, filterPriority, searchQuery])

    // 고정 (긴급) + 일반 분리
    const pinnedNotices = useMemo(() => {
        return filteredNotices.filter(n => n.priority === 'urgent').slice(0, 3)
    }, [filteredNotices])

    const regularNotices = useMemo(() => {
        return filteredNotices.filter(n => n.priority !== 'urgent')
    }, [filteredNotices])

    // 날짜별 그룹핑
    const groupedByDate = useMemo(() => {
        const groups = {}
        regularNotices.forEach(n => {
            const key = formatDateGroup(n.created_at)
            if (!groups[key]) groups[key] = []
            groups[key].push(n)
        })
        return groups
    }, [regularNotices])

    if (loading) {
        return (
            <div className="nm2-loading">
                <div className="nm2-spinner" /><p>공지 로딩 중...</p>
            </div>
        )
    }

    const targetCount = getTargetCount()

    return (
        <div className="nm2-page">
            {/* 헤더 */}
            <div className="nm2-header">
                <div>
                    <h1 className="nm2-title">📢 공지/메시지</h1>
                    <p className="nm2-subtitle">총 {notices.length}건 · 회원 {members.length}명</p>
                </div>
                <button className="nm2-cta" onClick={openNewForm}>
                    <Send size={14} />
                    새 공지 작성
                </button>
            </div>

            {/* 통계 카드 */}
            <div className="nm2-stat-row">
                <div className="nm2-stat-card">
                    <div className="nm2-stat-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <div className="nm2-stat-value">{notices.filter(n => n.priority === 'urgent').length}</div>
                        <div className="nm2-stat-label">긴급 공지</div>
                    </div>
                </div>
                <div className="nm2-stat-card">
                    <div className="nm2-stat-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                        <Megaphone size={18} />
                    </div>
                    <div>
                        <div className="nm2-stat-value">{notices.filter(n => n.priority === 'important').length}</div>
                        <div className="nm2-stat-label">중요 공지</div>
                    </div>
                </div>
                <div className="nm2-stat-card">
                    <div className="nm2-stat-icon" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
                        <Megaphone size={18} />
                    </div>
                    <div>
                        <div className="nm2-stat-value">{notices.filter(n => n.priority === 'normal').length}</div>
                        <div className="nm2-stat-label">일반 공지</div>
                    </div>
                </div>
                <div className="nm2-stat-card">
                    <div className="nm2-stat-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <Eye size={18} />
                    </div>
                    <div>
                        <div className="nm2-stat-value">
                            {notices.length > 0
                                ? Math.round(Object.values(readStats).reduce((s, v) => s + v, 0) / notices.length)
                                : 0}
                        </div>
                        <div className="nm2-stat-label">평균 읽음수</div>
                    </div>
                </div>
            </div>

            {/* 필터 + 검색 */}
            <div className="nm2-toolbar">
                <div className="nm2-search">
                    <input
                        type="text"
                        placeholder="🔍 공지 제목/내용 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')}><X size={14} /></button>
                    )}
                </div>
                <div className="nm2-filter-pills">
                    {[
                        { key: 'all', label: '전체' },
                        { key: 'urgent', label: '🚨 긴급', color: 'var(--danger)' },
                        { key: 'important', label: '⚠️ 중요', color: 'var(--warning)' },
                        { key: 'normal', label: '📢 일반', color: 'var(--info)' },
                    ].map(p => (
                        <button
                            key={p.key}
                            className={`nm2-filter-pill ${filterPriority === p.key ? 'active' : ''}`}
                            onClick={() => setFilterPriority(p.key)}
                            style={filterPriority === p.key && p.color ? { color: p.color, borderColor: p.color } : {}}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 메인: 카톡 스타일 메시지 리스트 */}
            <div className="nm2-content">
                {filteredNotices.length === 0 ? (
                    <div className="nm2-empty">
                        <div className="nm2-empty-icon">📭</div>
                        <h3>공지가 없습니다</h3>
                        <p>{searchQuery ? '검색 조건에 맞는 공지 없음' : '첫 공지를 작성해보세요'}</p>
                        {!searchQuery && (
                            <button className="nm2-cta" onClick={openNewForm}>
                                <Send size={14} /> 첫 공지 작성
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* 고정 (긴급) 영역 */}
                        {pinnedNotices.length > 0 && (
                            <div className="nm2-pinned-section">
                                <div className="nm2-section-label">
                                    <Pin size={12} /> 긴급 공지
                                </div>
                                {pinnedNotices.map(n => (
                                    <NoticeCard
                                        key={n.id}
                                        notice={n}
                                        readCount={readStats[n.id] || 0}
                                        memberCount={n.target_count || members.length}
                                        getTargetSummary={getTargetSummary}
                                        onClick={() => setSelectedNotice(n)}
                                        pinned
                                    />
                                ))}
                            </div>
                        )}

                        {/* 일반 메시지 (날짜별 그룹) */}
                        <div className="nm2-messages">
                            {Object.entries(groupedByDate).map(([dateGroup, items]) => (
                                <div key={dateGroup} className="nm2-date-group">
                                    <div className="nm2-date-divider">
                                        <span>{dateGroup}</span>
                                    </div>
                                    {items.map(n => (
                                        <NoticeCard
                                            key={n.id}
                                            notice={n}
                                            readCount={readStats[n.id] || 0}
                                            memberCount={n.target_count || members.length}
                                            getTargetSummary={getTargetSummary}
                                            onClick={() => setSelectedNotice(n)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* 상세 모달 */}
            {selectedNotice && (
                <>
                    <div className="nm2-modal-overlay" onClick={() => setSelectedNotice(null)} />
                    <div className="nm2-detail-modal">
                        <div className="nm2-detail-header">
                            <div>
                                <span
                                    className="nm2-priority-badge"
                                    style={{
                                        background: PRIORITY_OPTIONS.find(p => p.key === selectedNotice.priority)?.color,
                                    }}
                                >
                                    {PRIORITY_OPTIONS.find(p => p.key === selectedNotice.priority)?.emoji}
                                    {' '}
                                    {PRIORITY_OPTIONS.find(p => p.key === selectedNotice.priority)?.label}
                                </span>
                                <h2 className="nm2-detail-title">{selectedNotice.title}</h2>
                                <div className="nm2-detail-meta">
                                    <span>✍️ {selectedNotice.admin_users?.name || '관리자'}</span>
                                    <span>📅 {new Date(selectedNotice.created_at).toLocaleString('ko-KR')}</span>
                                </div>
                            </div>
                            <button className="nm2-modal-close" onClick={() => setSelectedNotice(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="nm2-detail-target">
                            <Users size={14} />
                            대상: {getTargetSummary(selectedNotice)}
                            <span className="nm2-detail-read">
                                <Eye size={12} /> {readStats[selectedNotice.id] || 0}/{selectedNotice.target_count || members.length}명 읽음
                            </span>
                        </div>

                        <div className="nm2-detail-content">
                            {selectedNotice.content.split('\n').map((line, i) => (
                                <p key={i}>{line || ' '}</p>
                            ))}
                        </div>

                        <div className="nm2-detail-footer">
                            {deleteConfirm === selectedNotice.id ? (
                                <>
                                    <span style={{ marginRight: 'auto', color: 'var(--danger)', fontSize: 13 }}>정말 삭제하시겠어요?</span>
                                    <button className="nm2-btn-cancel" onClick={() => setDeleteConfirm(null)}>취소</button>
                                    <button className="nm2-btn-delete" onClick={() => handleDelete(selectedNotice.id)}>삭제</button>
                                </>
                            ) : (
                                <button className="nm2-btn-delete-init" onClick={() => setDeleteConfirm(selectedNotice.id)}>
                                    <Trash2 size={14} /> 삭제
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* 작성 모달 */}
            {showForm && (
                <>
                    <div className="nm2-modal-overlay" onClick={() => setShowForm(false)} />
                    <div className="nm2-form-modal">
                        <div className="nm2-modal-header">
                            <h2>📢 새 공지 작성</h2>
                            <button className="nm2-modal-close" onClick={() => setShowForm(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="nm2-modal-body">
                            <div className="nm2-form-group">
                                <label>우선순위</label>
                                <div className="nm2-form-chips">
                                    {PRIORITY_OPTIONS.map(p => (
                                        <button
                                            key={p.key}
                                            type="button"
                                            className={`nm2-form-chip ${form.priority === p.key ? 'active' : ''}`}
                                            style={form.priority === p.key ? {
                                                background: p.color, borderColor: p.color, color: '#FFF',
                                            } : {}}
                                            onClick={() => setForm({ ...form, priority: p.key })}
                                        >
                                            {p.emoji} {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="nm2-form-group">
                                <label>제목</label>
                                <input
                                    type="text"
                                    className="nm2-form-input"
                                    placeholder="공지 제목"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    maxLength={100}
                                />
                            </div>

                            <div className="nm2-form-group">
                                <label>내용</label>
                                <textarea
                                    className="nm2-form-textarea"
                                    placeholder="공지 내용을 입력하세요"
                                    value={form.content}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                    rows={6}
                                />
                            </div>

                            <div className="nm2-form-group">
                                <label>🎯 수신 대상</label>
                                <div className="nm2-target-section">
                                    <div className="nm2-target-row">
                                        <span>연령</span>
                                        <div className="nm2-form-chips">
                                            {AGE_GROUPS.map(g => (
                                                <button
                                                    key={g.key}
                                                    type="button"
                                                    className={`nm2-form-chip mini ${form.target_age.includes(g.key) ? 'active' : ''}`}
                                                    onClick={() => setForm({ ...form, target_age: toggleArrayItem(form.target_age, g.key) })}
                                                >
                                                    {g.icon} {g.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="nm2-target-row">
                                        <span>성별</span>
                                        <div className="nm2-form-chips">
                                            {GENDER_OPTIONS.map(g => (
                                                <button
                                                    key={g.key}
                                                    type="button"
                                                    className={`nm2-form-chip mini ${form.target_gender.includes(g.key) ? 'active' : ''}`}
                                                    onClick={() => setForm({ ...form, target_gender: toggleArrayItem(form.target_gender, g.key) })}
                                                >
                                                    {g.icon} {g.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="nm2-target-row">
                                        <span>상태</span>
                                        <div className="nm2-form-chips">
                                            {STATUS_OPTIONS.map(s => (
                                                <button
                                                    key={s.key}
                                                    type="button"
                                                    className={`nm2-form-chip mini ${form.target_status.includes(s.key) ? 'active' : ''}`}
                                                    onClick={() => setForm({ ...form, target_status: toggleArrayItem(form.target_status, s.key) })}
                                                >
                                                    {s.icon} {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="nm2-target-preview">
                                <Users size={16} />
                                <span>
                                    {form.target_age.length === 0 && form.target_gender.length === 0 && form.target_status.length === 0
                                        ? `전체 회원 ${members.length}명에게 발송`
                                        : `선택된 조건 ${targetCount}명에게 발송`
                                    }
                                </span>
                            </div>
                        </div>

                        <div className="nm2-modal-footer">
                            <button className="nm2-btn-cancel" onClick={() => setShowForm(false)}>취소</button>
                            <button
                                className="nm2-btn-send"
                                onClick={handleSave}
                                disabled={saving || !form.title.trim() || !form.content.trim()}
                            >
                                <Send size={14} />
                                {saving ? '발송 중...' : '공지 발송'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

// === 공지 카드 ===
function NoticeCard({ notice, readCount, memberCount, getTargetSummary, onClick, pinned }) {
    const p = PRIORITY_OPTIONS.find(o => o.key === notice.priority) || PRIORITY_OPTIONS[2]
    const readPct = memberCount > 0 ? Math.round(readCount / memberCount * 100) : 0

    return (
        <button className={`nm2-card ${pinned ? 'pinned' : ''}`} onClick={onClick} style={{ borderLeftColor: p.color }}>
            <div className="nm2-card-top">
                <span className="nm2-card-priority" style={{ color: p.color }}>
                    {p.emoji} {p.label}
                </span>
                <span className="nm2-card-time">{timeAgo(notice.created_at)}</span>
            </div>
            <h3 className="nm2-card-title">{notice.title}</h3>
            <p className="nm2-card-content">{notice.content}</p>
            <div className="nm2-card-footer">
                <span className="nm2-card-target">
                    <Users size={11} /> {getTargetSummary(notice)}
                </span>
                <span className="nm2-card-read">
                    <Eye size={11} /> {readCount}/{memberCount} ({readPct}%)
                </span>
            </div>
            {readPct > 0 && (
                <div className="nm2-card-progress">
                    <div className="nm2-card-progress-bar" style={{ width: `${readPct}%`, background: p.color }} />
                </div>
            )}
        </button>
    )
}
