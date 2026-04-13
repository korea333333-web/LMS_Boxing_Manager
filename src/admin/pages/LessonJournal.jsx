import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TARGET_GROUPS = [
    { key: 'all', label: '전체', icon: '👥' },
    { key: 'elementary', label: '초등반', icon: '🧒' },
    { key: 'middle', label: '중등반', icon: '📚' },
    { key: 'high', label: '고등반', icon: '🎓' },
    { key: 'adult', label: '성인반', icon: '👤' },
]

function formatDate(dateStr) {
    const d = new Date(dateStr)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[d.getDay()]
    return `${month}월 ${day}일 (${weekday})`
}

function getToday() {
    const d = new Date()
    return d.toISOString().split('T')[0]
}

export default function LessonJournal() {
    const [lessons, setLessons] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState({
        title: '',
        content: '',
        lesson_date: getToday(),
        target_group: 'all',
    })
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [filterGroup, setFilterGroup] = useState('all')
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => {
        fetchLessons()
    }, [])

    async function fetchLessons() {
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select('*, admin_users(name)')
                .order('lesson_date', { ascending: false })

            if (error) throw error
            setLessons(data || [])
        } catch (err) {
            console.error('수업일지 로딩 에러:', err)
        } finally {
            setLoading(false)
        }
    }

    function openNewForm() {
        setForm({ title: '', content: '', lesson_date: getToday(), target_group: 'all' })
        setEditingId(null)
        setShowForm(true)
    }

    function openEditForm(lesson) {
        setForm({
            title: lesson.title,
            content: lesson.content,
            lesson_date: lesson.lesson_date,
            target_group: lesson.target_group,
        })
        setEditingId(lesson.id)
        setShowForm(true)
    }

    async function handleSave() {
        if (!form.title.trim() || !form.content.trim()) return
        setSaving(true)
        try {
            const session = JSON.parse(localStorage.getItem('admin_session'))
            if (editingId) {
                const { error } = await supabase
                    .from('lessons')
                    .update({
                        title: form.title.trim(),
                        content: form.content.trim(),
                        lesson_date: form.lesson_date,
                        target_group: form.target_group,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingId)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('lessons')
                    .insert({
                        title: form.title.trim(),
                        content: form.content.trim(),
                        lesson_date: form.lesson_date,
                        target_group: form.target_group,
                        created_by: session?.id || null,
                    })
                if (error) throw error
            }
            setShowForm(false)
            setEditingId(null)
            fetchLessons()
        } catch (err) {
            console.error('저장 에러:', err)
            alert('저장에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id) {
        try {
            const { error } = await supabase.from('lessons').delete().eq('id', id)
            if (error) throw error
            setDeleteConfirm(null)
            fetchLessons()
        } catch (err) {
            console.error('삭제 에러:', err)
        }
    }

    const filteredLessons = filterGroup === 'all'
        ? lessons
        : lessons.filter(l => l.target_group === filterGroup || l.target_group === 'all')

    // 날짜별 그룹핑
    const groupedByDate = {}
    filteredLessons.forEach(lesson => {
        const dateKey = lesson.lesson_date
        if (!groupedByDate[dateKey]) groupedByDate[dateKey] = []
        groupedByDate[dateKey].push(lesson)
    })

    if (loading) {
        return <div className="admin-page-placeholder"><h2>로딩 중...</h2></div>
    }

    return (
        <div className="lj-page">
            {/* 헤더 */}
            <div className="lj-header">
                <div className="lj-header-left">
                    <h1 className="lj-title">📋 수업일지</h1>
                    <span className="lj-count">총 {lessons.length}건</span>
                </div>
                <button className="lj-add-btn" onClick={openNewForm}>
                    + 수업일지 작성
                </button>
            </div>

            {/* 반 필터 */}
            <div className="lj-filter-bar">
                {TARGET_GROUPS.map(g => (
                    <button
                        key={g.key}
                        className={`lj-filter-chip ${filterGroup === g.key ? 'active' : ''}`}
                        onClick={() => setFilterGroup(g.key)}
                    >
                        <span>{g.icon}</span>
                        <span>{g.label}</span>
                    </button>
                ))}
            </div>

            {/* 수업일지 목록 */}
            <div className="lj-list">
                {Object.keys(groupedByDate).length === 0 ? (
                    <div className="lj-empty">
                        <span className="lj-empty-icon">📝</span>
                        <p>아직 작성된 수업일지가 없습니다</p>
                        <button className="lj-empty-btn" onClick={openNewForm}>첫 수업일지 작성하기</button>
                    </div>
                ) : (
                    Object.entries(groupedByDate).map(([dateKey, dateLessons]) => (
                        <div key={dateKey} className="lj-date-group">
                            <div className="lj-date-label">
                                <span className="lj-date-dot" />
                                {formatDate(dateKey)}
                            </div>
                            {dateLessons.map(lesson => {
                                const group = TARGET_GROUPS.find(g => g.key === lesson.target_group)
                                const isExpanded = expandedId === lesson.id
                                return (
                                    <div key={lesson.id} className="lj-card">
                                        <div
                                            className="lj-card-header"
                                            onClick={() => setExpandedId(isExpanded ? null : lesson.id)}
                                        >
                                            <div className="lj-card-left">
                                                <span className={`lj-group-badge ${lesson.target_group}`}>
                                                    {group?.icon} {group?.label}
                                                </span>
                                                <span className="lj-card-title">{lesson.title}</span>
                                            </div>
                                            <div className="lj-card-right">
                                                <span className="lj-card-author">
                                                    {lesson.admin_users?.name || '관리자'}
                                                </span>
                                                <span className={`lj-card-chevron ${isExpanded ? 'open' : ''}`}>▾</span>
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="lj-card-body">
                                                <div className="lj-card-content">
                                                    {lesson.content.split('\n').map((line, i) => (
                                                        <p key={i}>{line || '\u00A0'}</p>
                                                    ))}
                                                </div>
                                                <div className="lj-card-actions">
                                                    <button
                                                        className="lj-action-btn edit"
                                                        onClick={(e) => { e.stopPropagation(); openEditForm(lesson) }}
                                                    >
                                                        ✏️ 수정
                                                    </button>
                                                    {deleteConfirm === lesson.id ? (
                                                        <div className="lj-delete-confirm">
                                                            <span>정말 삭제?</span>
                                                            <button className="lj-action-btn delete" onClick={() => handleDelete(lesson.id)}>삭제</button>
                                                            <button className="lj-action-btn cancel" onClick={() => setDeleteConfirm(null)}>취소</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="lj-action-btn delete"
                                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(lesson.id) }}
                                                        >
                                                            🗑️ 삭제
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))
                )}
            </div>

            {/* 작성/수정 모달 */}
            {showForm && (
                <div className="lj-modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="lj-modal" onClick={e => e.stopPropagation()}>
                        <div className="lj-modal-header">
                            <h2>{editingId ? '수업일지 수정' : '수업일지 작성'}</h2>
                            <button className="lj-modal-close" onClick={() => setShowForm(false)}>✕</button>
                        </div>
                        <div className="lj-modal-body">
                            {/* 날짜 선택 */}
                            <div className="lj-form-group">
                                <label className="lj-form-label">📅 수업 날짜</label>
                                <input
                                    type="date"
                                    className="lj-form-input"
                                    value={form.lesson_date}
                                    onChange={e => setForm({ ...form, lesson_date: e.target.value })}
                                />
                            </div>

                            {/* 대상 반 선택 */}
                            <div className="lj-form-group">
                                <label className="lj-form-label">🎯 대상 반</label>
                                <div className="lj-form-chips">
                                    {TARGET_GROUPS.map(g => (
                                        <button
                                            key={g.key}
                                            className={`lj-form-chip ${form.target_group === g.key ? 'active' : ''}`}
                                            onClick={() => setForm({ ...form, target_group: g.key })}
                                        >
                                            {g.icon} {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 제목 */}
                            <div className="lj-form-group">
                                <label className="lj-form-label">제목</label>
                                <input
                                    type="text"
                                    className="lj-form-input"
                                    placeholder="예: 기본기 훈련 - 잽, 스트레이트"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    maxLength={100}
                                />
                            </div>

                            {/* 내용 */}
                            <div className="lj-form-group">
                                <label className="lj-form-label">수업 내용</label>
                                <textarea
                                    className="lj-form-textarea"
                                    placeholder={"오늘 수업에서 진행한 내용을 적어주세요.\n\n예:\n- 워밍업: 줄넘기 3라운드\n- 기본기: 잽-스트레이트 콤비네이션\n- 미트 훈련: 2인 1조\n- 쿨다운: 스트레칭"}
                                    value={form.content}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                    rows={8}
                                />
                            </div>
                        </div>
                        <div className="lj-modal-footer">
                            <button className="lj-btn-cancel" onClick={() => setShowForm(false)}>취소</button>
                            <button
                                className="lj-btn-save"
                                onClick={handleSave}
                                disabled={saving || !form.title.trim() || !form.content.trim()}
                            >
                                {saving ? '저장 중...' : (editingId ? '수정 완료' : '작성 완료')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
