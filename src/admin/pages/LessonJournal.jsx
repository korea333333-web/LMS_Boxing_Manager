import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
    ChevronLeft, ChevronRight, Plus, X, Edit3, Trash2, Save,
    Calendar as CalendarIcon, Users, BookOpen, Filter, RotateCcw,
} from 'lucide-react'

const TARGET_GROUPS = [
    { key: 'all', label: '전체', icon: '👥', color: '#0A84FF' },
    { key: 'elementary', label: '초등반', icon: '🧒', color: '#30D158' },
    { key: 'middle', label: '중등반', icon: '📚', color: '#FFD60A' },
    { key: 'high', label: '고등반', icon: '🎓', color: '#BF5AF2' },
    { key: 'adult', label: '성인반', icon: '👤', color: '#FF3B47' },
]

function getGroupInfo(key) {
    return TARGET_GROUPS.find(g => g.key === key) || TARGET_GROUPS[0]
}

function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a, b) {
    return a && b && dateKey(a) === dateKey(b)
}

function todayDate() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

export default function LessonJournal() {
    const [lessons, setLessons] = useState([])
    const [loading, setLoading] = useState(true)
    const [calMonth, setCalMonth] = useState(todayDate())
    const [selectedDate, setSelectedDate] = useState(todayDate())
    const [filterGroup, setFilterGroup] = useState('all')

    // 작성/수정 모달
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState({
        title: '', content: '', lesson_date: dateKey(new Date()), target_group: 'all',
    })
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    useEffect(() => { fetchLessons() }, [])

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

    // 필터링된 일지 (필터 적용)
    const filteredLessons = useMemo(() => {
        if (filterGroup === 'all') return lessons
        return lessons.filter(l => l.target_group === filterGroup || l.target_group === 'all')
    }, [lessons, filterGroup])

    // 날짜별 일지 맵 (캘린더 표시용)
    const lessonsByDate = useMemo(() => {
        const m = {}
        filteredLessons.forEach(l => {
            const k = l.lesson_date
            if (!m[k]) m[k] = []
            m[k].push(l)
        })
        return m
    }, [filteredLessons])

    // 선택된 날짜의 일지들
    const selectedDateLessons = useMemo(() => {
        const k = dateKey(selectedDate)
        return lessonsByDate[k] || []
    }, [lessonsByDate, selectedDate])

    // 이번 달 통계
    const monthStats = useMemo(() => {
        const year = calMonth.getFullYear()
        const month = calMonth.getMonth()
        const monthLessons = lessons.filter(l => {
            const d = new Date(l.lesson_date)
            return d.getFullYear() === year && d.getMonth() === month
        })
        const byGroup = {}
        monthLessons.forEach(l => {
            byGroup[l.target_group] = (byGroup[l.target_group] || 0) + 1
        })
        return { total: monthLessons.length, byGroup }
    }, [lessons, calMonth])

    // 캘린더 날짜 배열
    const calendarDays = useMemo(() => {
        const year = calMonth.getFullYear()
        const month = calMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startDayOfWeek = firstDay.getDay()
        const days = []

        // 이전 달 마지막 날들
        const prevLast = new Date(year, month, 0).getDate()
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, prevLast - i)
            days.push({ date: d, otherMonth: true })
        }
        // 이번 달
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), otherMonth: false })
        }
        // 다음 달 (6주 채우기)
        const remaining = 42 - days.length
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(year, month + 1, i), otherMonth: true })
        }
        return days
    }, [calMonth])

    function openNewForm(date) {
        setForm({
            title: '', content: '',
            lesson_date: dateKey(date || selectedDate),
            target_group: 'all',
        })
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
            const session = JSON.parse(localStorage.getItem('admin_session') || '{}')
            if (editingId) {
                const { error } = await supabase.from('lessons').update({
                    title: form.title.trim(),
                    content: form.content.trim(),
                    lesson_date: form.lesson_date,
                    target_group: form.target_group,
                    updated_at: new Date().toISOString(),
                }).eq('id', editingId)
                if (error) throw error
            } else {
                const { error } = await supabase.from('lessons').insert({
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
            alert('저장 실패')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id) {
        try {
            await supabase.from('lessons').delete().eq('id', id)
            setDeleteConfirm(null)
            fetchLessons()
        } catch (err) {
            console.error(err)
        }
    }

    if (loading) {
        return (
            <div className="lj2-loading">
                <div className="lj2-spinner" /><p>수업일지 로딩 중...</p>
            </div>
        )
    }

    const monthLabel = `${calMonth.getFullYear()}년 ${calMonth.getMonth() + 1}월`
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const today = todayDate()
    const sameMonthAsToday = calMonth.getFullYear() === today.getFullYear() && calMonth.getMonth() === today.getMonth()

    return (
        <div className="lj2-page">
            {/* 헤더 */}
            <div className="lj2-header">
                <div>
                    <h1 className="lj2-title">📋 수업일지</h1>
                    <p className="lj2-subtitle">
                        총 {lessons.length}개 · 이번 달 {monthStats.total}개
                    </p>
                </div>
                <div className="lj2-header-actions">
                    {/* 반별 필터 */}
                    <div className="lj2-filter">
                        <Filter size={14} />
                        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
                            {TARGET_GROUPS.map(g => (
                                <option key={g.key} value={g.key}>{g.icon} {g.label}</option>
                            ))}
                        </select>
                    </div>
                    <button className="lj2-cta" onClick={() => openNewForm(selectedDate)}>
                        <Plus size={16} />
                        일지 작성
                    </button>
                </div>
            </div>

            {/* 메인: 좌측 달력 + 우측 상세 */}
            <div className="lj2-body">
                {/* 좌측 달력 */}
                <div className="lj2-calendar-panel">
                    <div className="lj2-cal-header">
                        <button className="lj2-cal-nav" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}>
                            <ChevronLeft size={16} />
                        </button>
                        <div className="lj2-cal-month">{monthLabel}</div>
                        <button className="lj2-cal-nav" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}>
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {!sameMonthAsToday && (
                        <button className="lj2-today-btn" onClick={() => { setCalMonth(today); setSelectedDate(today) }}>
                            <RotateCcw size={12} /> 오늘로 돌아가기
                        </button>
                    )}

                    <div className="lj2-cal-grid">
                        {weekdays.map((d, i) => (
                            <div key={d} className={`lj2-cal-weekday ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{d}</div>
                        ))}
                        {calendarDays.map((d, i) => {
                            const k = dateKey(d.date)
                            const dayLessons = lessonsByDate[k] || []
                            const isSelected = isSameDay(d.date, selectedDate)
                            const isTodayDate = isSameDay(d.date, today)
                            const dayOfWeek = d.date.getDay()
                            return (
                                <button
                                    key={i}
                                    className={`lj2-cal-day
                                        ${d.otherMonth ? 'other' : ''}
                                        ${isSelected ? 'selected' : ''}
                                        ${isTodayDate ? 'today' : ''}
                                        ${dayLessons.length > 0 ? 'has-lesson' : ''}
                                    `}
                                    onClick={() => setSelectedDate(d.date)}
                                >
                                    <span className={`lj2-day-num ${dayOfWeek === 0 ? 'sun' : dayOfWeek === 6 ? 'sat' : ''}`}>
                                        {d.date.getDate()}
                                    </span>
                                    {dayLessons.length > 0 && (
                                        <div className="lj2-day-dots">
                                            {[...new Set(dayLessons.map(l => l.target_group))].slice(0, 5).map((g, idx) => (
                                                <span
                                                    key={idx}
                                                    className="lj2-day-dot"
                                                    style={{ background: getGroupInfo(g).color }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {dayLessons.length > 1 && (
                                        <span className="lj2-day-count">{dayLessons.length}</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* 범례 + 통계 */}
                    <div className="lj2-cal-legend">
                        <div className="lj2-legend-title">반별 색상</div>
                        <div className="lj2-legend-items">
                            {TARGET_GROUPS.map(g => (
                                <span key={g.key} className="lj2-legend-item">
                                    <span className="lj2-legend-dot" style={{ background: g.color }} />
                                    {g.label}
                                    {monthStats.byGroup[g.key] > 0 && (
                                        <span className="lj2-legend-count">{monthStats.byGroup[g.key]}</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 우측 상세 패널 */}
                <div className="lj2-detail-panel">
                    <div className="lj2-detail-header">
                        <div>
                            <div className="lj2-detail-date">
                                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 ({weekdays[selectedDate.getDay()]})
                            </div>
                            <div className="lj2-detail-count">
                                {selectedDateLessons.length > 0 ? `${selectedDateLessons.length}개 일지` : '일지 없음'}
                            </div>
                        </div>
                        <button className="lj2-detail-add" onClick={() => openNewForm(selectedDate)}>
                            <Plus size={14} /> 작성
                        </button>
                    </div>

                    <div className="lj2-detail-body">
                        {selectedDateLessons.length === 0 ? (
                            <div className="lj2-empty">
                                <div className="lj2-empty-icon">📝</div>
                                <p>이 날 작성된 일지가 없어요</p>
                                <button className="lj2-empty-btn" onClick={() => openNewForm(selectedDate)}>
                                    <Plus size={14} /> 첫 일지 작성하기
                                </button>
                            </div>
                        ) : (
                            selectedDateLessons.map(lesson => {
                                const g = getGroupInfo(lesson.target_group)
                                return (
                                    <div key={lesson.id} className="lj2-lesson-card" style={{ borderLeftColor: g.color }}>
                                        <div className="lj2-lesson-header">
                                            <div>
                                                <span className="lj2-lesson-badge" style={{ background: g.color }}>
                                                    {g.icon} {g.label}
                                                </span>
                                                <h3 className="lj2-lesson-title">{lesson.title}</h3>
                                            </div>
                                            <div className="lj2-lesson-actions">
                                                <button className="lj2-icon-btn" onClick={() => openEditForm(lesson)} title="수정">
                                                    <Edit3 size={14} />
                                                </button>
                                                {deleteConfirm === lesson.id ? (
                                                    <>
                                                        <button className="lj2-icon-btn confirm" onClick={() => handleDelete(lesson.id)}>삭제</button>
                                                        <button className="lj2-icon-btn" onClick={() => setDeleteConfirm(null)}>취소</button>
                                                    </>
                                                ) : (
                                                    <button className="lj2-icon-btn danger" onClick={() => setDeleteConfirm(lesson.id)} title="삭제">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="lj2-lesson-content">
                                            {lesson.content.split('\n').map((line, i) => (
                                                <p key={i}>{line || ' '}</p>
                                            ))}
                                        </div>
                                        {lesson.admin_users?.name && (
                                            <div className="lj2-lesson-footer">
                                                ✍️ {lesson.admin_users.name}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* 작성/수정 모달 */}
            {showForm && (
                <>
                    <div className="lj2-modal-overlay" onClick={() => setShowForm(false)} />
                    <div className="lj2-modal">
                        <div className="lj2-modal-header">
                            <h2>{editingId ? '✏️ 수업일지 수정' : '📝 수업일지 작성'}</h2>
                            <button className="lj2-modal-close" onClick={() => setShowForm(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="lj2-modal-body">
                            <div className="lj2-form-group">
                                <label className="lj2-form-label">📅 수업 날짜</label>
                                <input
                                    type="date"
                                    className="lj2-form-input"
                                    value={form.lesson_date}
                                    onChange={e => setForm({ ...form, lesson_date: e.target.value })}
                                />
                            </div>

                            <div className="lj2-form-group">
                                <label className="lj2-form-label">🎯 대상 반</label>
                                <div className="lj2-form-chips">
                                    {TARGET_GROUPS.map(g => (
                                        <button
                                            key={g.key}
                                            type="button"
                                            className={`lj2-form-chip ${form.target_group === g.key ? 'active' : ''}`}
                                            style={form.target_group === g.key ? { background: g.color, borderColor: g.color, color: '#FFF' } : {}}
                                            onClick={() => setForm({ ...form, target_group: g.key })}
                                        >
                                            {g.icon} {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="lj2-form-group">
                                <label className="lj2-form-label">제목</label>
                                <input
                                    type="text"
                                    className="lj2-form-input"
                                    placeholder="예: 기본기 훈련 - 잽 콤비네이션"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    maxLength={100}
                                />
                            </div>

                            <div className="lj2-form-group">
                                <label className="lj2-form-label">수업 내용</label>
                                <textarea
                                    className="lj2-form-textarea"
                                    placeholder={"오늘 수업에서 진행한 내용을 적어주세요.\n\n예:\n- 워밍업: 줄넘기 3R\n- 미트 5R\n- 쿨다운: 스트레칭"}
                                    value={form.content}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                    rows={10}
                                />
                            </div>
                        </div>
                        <div className="lj2-modal-footer">
                            <button className="lj2-btn-cancel" onClick={() => setShowForm(false)}>취소</button>
                            <button
                                className="lj2-btn-save"
                                onClick={handleSave}
                                disabled={saving || !form.title.trim() || !form.content.trim()}
                            >
                                <Save size={14} />
                                {saving ? '저장 중...' : (editingId ? '수정 완료' : '작성 완료')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
