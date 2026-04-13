import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AGE_GROUP_MAP = {
    elementary: { label: '초등반', icon: '🧒', range: [7, 12] },
    middle: { label: '중등반', icon: '📚', range: [13, 15] },
    high: { label: '고등반', icon: '🎓', range: [16, 18] },
    adult: { label: '성인반', icon: '👤', range: [19, 999] },
}

function getMemberAgeGroup(age) {
    if (!age) return null
    for (const [key, val] of Object.entries(AGE_GROUP_MAP)) {
        if (age >= val.range[0] && age <= val.range[1]) return key
    }
    return null
}

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

function formatDate(dateStr) {
    const d = new Date(dateStr)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    return `${month}월 ${day}일 (${weekdays[d.getDay()]})`
}

const PRIORITY_STYLES = {
    urgent: { bg: 'rgba(229,62,62,0.15)', color: '#E53E3E', label: '긴급' },
    important: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: '중요' },
    normal: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', label: '일반' },
}

export default function MemberHome({ member, onLogout }) {
    const [tab, setTab] = useState('notices')
    const [notices, setNotices] = useState([])
    const [lessons, setLessons] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [readIds, setReadIds] = useState(new Set())

    const memberAgeGroup = getMemberAgeGroup(member.age)

    useEffect(() => {
        fetchAll()
    }, [])

    async function fetchAll() {
        try {
            // 공지 가져오기 - 나에게 해당하는 것만
            const { data: allNotices } = await supabase
                .from('notices')
                .select('*')
                .order('created_at', { ascending: false })

            // 내게 해당하는 공지만 필터
            const myNotices = (allNotices || []).filter(n => {
                // 연령 필터
                if (n.target_age && n.target_age.length > 0) {
                    if (!memberAgeGroup || !n.target_age.includes(memberAgeGroup)) return false
                }
                // 성별 필터
                if (n.target_gender && n.target_gender.length > 0) {
                    if (!n.target_gender.includes(member.gender)) return false
                }
                return true
            })
            setNotices(myNotices)

            // 수업일지 가져오기 - 내 반 + 전체
            const { data: allLessons } = await supabase
                .from('lessons')
                .select('*')
                .order('lesson_date', { ascending: false })
                .limit(30)

            const myLessons = (allLessons || []).filter(l => {
                return l.target_group === 'all' || l.target_group === memberAgeGroup
            })
            setLessons(myLessons)

            // 읽음 상태 가져오기
            const { data: reads } = await supabase
                .from('notice_reads')
                .select('notice_id')
                .eq('member_id', member.id)

            setReadIds(new Set((reads || []).map(r => r.notice_id)))
        } catch (err) {
            console.error('데이터 로딩 에러:', err)
        } finally {
            setLoading(false)
        }
    }

    async function markAsRead(noticeId) {
        if (readIds.has(noticeId)) return
        try {
            await supabase.from('notice_reads').insert({
                notice_id: noticeId,
                member_id: member.id,
            })
            setReadIds(prev => new Set([...prev, noticeId]))
        } catch (err) {
            // unique 위반은 무시
        }
    }

    function handleExpandNotice(noticeId) {
        if (expandedId === noticeId) {
            setExpandedId(null)
        } else {
            setExpandedId(noticeId)
            markAsRead(noticeId)
        }
    }

    const unreadCount = notices.filter(n => !readIds.has(n.id)).length

    if (loading) {
        return (
            <div className="mh-page">
                <div className="mh-loading">로딩 중...</div>
            </div>
        )
    }

    return (
        <div className="mh-page">
            {/* 상단 헤더 */}
            <div className="mh-header">
                <div className="mh-header-left">
                    <span className="mh-header-logo">🥊</span>
                    <span className="mh-header-title">바디복싱짐</span>
                </div>
                <div className="mh-header-right">
                    <span className="mh-header-name">{member.name}님</span>
                    <button className="mh-logout-btn" onClick={onLogout}>로그아웃</button>
                </div>
            </div>

            {/* 환영 배너 */}
            <div className="mh-welcome">
                <div className="mh-welcome-text">
                    <h2>안녕하세요, {member.name}님! 👋</h2>
                    <p>
                        {memberAgeGroup ? `${AGE_GROUP_MAP[memberAgeGroup]?.icon} ${AGE_GROUP_MAP[memberAgeGroup]?.label}` : ''}
                        {' '}오늘도 화이팅!
                    </p>
                </div>
            </div>

            {/* 탭 */}
            <div className="mh-tabs">
                <button
                    className={`mh-tab ${tab === 'notices' ? 'active' : ''}`}
                    onClick={() => setTab('notices')}
                >
                    📢 공지사항
                    {unreadCount > 0 && <span className="mh-tab-badge">{unreadCount}</span>}
                </button>
                <button
                    className={`mh-tab ${tab === 'lessons' ? 'active' : ''}`}
                    onClick={() => setTab('lessons')}
                >
                    📋 수업일지
                </button>
            </div>

            {/* 콘텐츠 */}
            <div className="mh-content">
                {tab === 'notices' ? (
                    notices.length === 0 ? (
                        <div className="mh-empty">
                            <span>📭</span>
                            <p>새로운 공지가 없습니다</p>
                        </div>
                    ) : (
                        notices.map(notice => {
                            const ps = PRIORITY_STYLES[notice.priority] || PRIORITY_STYLES.normal
                            const isRead = readIds.has(notice.id)
                            const isExpanded = expandedId === notice.id
                            return (
                                <div
                                    key={notice.id}
                                    className={`mh-notice-card ${isRead ? 'read' : 'unread'}`}
                                    onClick={() => handleExpandNotice(notice.id)}
                                >
                                    <div className="mh-notice-top">
                                        <span
                                            className="mh-notice-priority"
                                            style={{ background: ps.bg, color: ps.color }}
                                        >
                                            {ps.label}
                                        </span>
                                        <span className="mh-notice-time">{timeAgo(notice.created_at)}</span>
                                    </div>
                                    <div className="mh-notice-title">
                                        {!isRead && <span className="mh-unread-dot" />}
                                        {notice.title}
                                    </div>
                                    {isExpanded && (
                                        <div className="mh-notice-body">
                                            {notice.content.split('\n').map((line, i) => (
                                                <p key={i}>{line || '\u00A0'}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )
                ) : (
                    lessons.length === 0 ? (
                        <div className="mh-empty">
                            <span>📝</span>
                            <p>아직 수업일지가 없습니다</p>
                        </div>
                    ) : (
                        lessons.map(lesson => {
                            const group = AGE_GROUP_MAP[lesson.target_group]
                            const isExpanded = expandedId === lesson.id
                            return (
                                <div
                                    key={lesson.id}
                                    className="mh-lesson-card"
                                    onClick={() => setExpandedId(isExpanded ? null : lesson.id)}
                                >
                                    <div className="mh-lesson-top">
                                        <span className="mh-lesson-date">
                                            {formatDate(lesson.lesson_date)}
                                        </span>
                                        {group && (
                                            <span className="mh-lesson-group">
                                                {group.icon} {group.label}
                                            </span>
                                        )}
                                        {lesson.target_group === 'all' && (
                                            <span className="mh-lesson-group">👥 전체</span>
                                        )}
                                    </div>
                                    <div className="mh-lesson-title">{lesson.title}</div>
                                    {isExpanded && (
                                        <div className="mh-lesson-body">
                                            {lesson.content.split('\n').map((line, i) => (
                                                <p key={i}>{line || '\u00A0'}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )
                )}
            </div>
        </div>
    )
}
