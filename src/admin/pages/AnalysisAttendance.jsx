import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

export default function AnalysisAttendance() {
    const [members, setMembers] = useState([])
    const [attendance, setAttendance] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            const [membersRes, attendanceRes] = await Promise.all([
                supabase.from('members').select('*'),
                supabase.from('attendance').select('*').order('checked_at', { ascending: false }).limit(1000)
            ])
            setMembers(membersRes.data || [])
            setAttendance((attendanceRes.data || []).filter(a => !a.qr_data?.startsWith('exit-')))
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // 이번 주 평균 출석율
    const weeklyRate = useMemo(() => {
        if (members.length === 0) return 0
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const thisWeek = attendance.filter(a => new Date(a.checked_at) >= weekStart)
        const daysPassed = Math.max(1, Math.min(7, Math.floor((now - weekStart) / (1000 * 60 * 60 * 24)) + 1))
        return Math.min(100, ((thisWeek.length / (members.length * daysPassed)) * 100).toFixed(1))
    }, [members, attendance])

    // 최고 출석 요일
    const bestDay = useMemo(() => {
        const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
        const counts = Array(7).fill(0)
        attendance.forEach(a => { counts[new Date(a.checked_at).getDay()]++ })
        const maxIdx = counts.indexOf(Math.max(...counts))
        const avgPerDay = members.length > 0 ? Math.round(counts[maxIdx] / Math.max(1, Math.ceil(attendance.length / 7 / members.length) || 1)) : 0
        return { name: dayNames[maxIdx], count: avgPerDay }
    }, [members, attendance])

    // 장기 미출석자
    const absentees = useMemo(() => {
        const now = new Date()
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
        return members.filter(m => {
            const memberAtt = attendance.filter(a => a.member_id === m.id)
            if (memberAtt.length === 0) return true
            const lastDate = new Date(memberAtt[0].checked_at)
            return lastDate < thirtyDaysAgo
        }).length
    }, [members, attendance])

    // 요일별/시간대별 히트맵 데이터
    const heatmapData = useMemo(() => {
        const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        const timeSlots = ['06:00', '10:00', '14:00', '18:00', '21:00']
        const grid = timeSlots.map(() => dayLabels.map(() => 0))

        attendance.forEach(a => {
            const d = new Date(a.checked_at)
            const dayIdx = (d.getDay() + 6) % 7
            const hour = d.getHours()
            let timeIdx = 0
            if (hour >= 21) timeIdx = 4
            else if (hour >= 18) timeIdx = 3
            else if (hour >= 14) timeIdx = 2
            else if (hour >= 10) timeIdx = 1
            else timeIdx = 0
            if (dayIdx < 7 && timeIdx < 5) grid[timeIdx][dayIdx]++
        })

        const maxVal = Math.max(1, ...grid.flat())
        return { dayLabels, timeSlots, grid, maxVal }
    }, [attendance])

    // 이달의 출석왕 TOP 5
    const topAttenders = useMemo(() => {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const thisMonth = attendance.filter(a => new Date(a.checked_at) >= monthStart)

        const countMap = {}
        thisMonth.forEach(a => { countMap[a.member_id] = (countMap[a.member_id] || 0) + 1 })

        const daysPassed = Math.max(1, Math.floor((now - monthStart) / (1000 * 60 * 60 * 24)))

        return Object.entries(countMap)
            .map(([id, count]) => {
                const member = members.find(m => m.id === id)
                return {
                    id,
                    name: member?.name || '알수없음',
                    count,
                    rate: Math.min(100, Math.round((count / daysPassed) * 100))
                }
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
    }, [members, attendance])

    // 월간 출석율 추이 (최근 4개월)
    const monthlyTrend = useMemo(() => {
        const now = new Date()
        return Array.from({ length: 4 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - 3 + i, 1)
            const end = new Date(now.getFullYear(), now.getMonth() - 2 + i, 0)
            const monthAtt = attendance.filter(a => {
                const ad = new Date(a.checked_at)
                return ad >= d && ad <= end
            })
            const daysInMonth = end.getDate()
            const rate = members.length > 0 ? Math.min(100, Math.round((monthAtt.length / (members.length * daysInMonth)) * 100)) : 0
            return { label: `${d.getMonth() + 1 < 10 ? '0' : ''}${d.getMonth() + 1}월`, rate }
        })
    }, [members, attendance])

    const RANK_COLORS = ['#E53E3E', '#F59E0B', '#3B82F6', '#888', '#888']

    if (loading) {
        return (
            <div className="an-loading">
                <div className="an-loading-spinner"></div>
                <p>데이터를 불러오는 중...</p>
            </div>
        )
    }

    return (
        <div className="an-page">
            <div className="an-page-header">
                <div>
                    <div className="an-breadcrumb">분석 &gt; <span className="an-breadcrumb-active">출석 분석</span></div>
                    <h1 className="an-page-title">전체 및 개인별 출석율 분석</h1>
                    <p className="an-page-desc">체육관 운영 효율을 위한 데이터 기반 출석 통계</p>
                </div>
                <button className="an-download-btn">📥 보고서 다운로드</button>
            </div>

            {/* 요약 카드 3개 */}
            <div className="an-summary-grid three">
                <div className="an-summary-card">
                    <span className="an-summary-label">이번 주 평균 출석율</span>
                    <div className="an-summary-value">{weeklyRate}<small>%</small></div>
                    <div className="an-progress-bar">
                        <div className="an-progress-fill" style={{ width: `${weeklyRate}%` }}></div>
                    </div>
                </div>
                <div className="an-summary-card">
                    <span className="an-summary-label">최고 출석 요일</span>
                    <div className="an-summary-value large-text">{bestDay.name}</div>
                    <span className="an-summary-sub">평균 {bestDay.count}명</span>
                </div>
                <div className="an-summary-card">
                    <span className="an-summary-label">장기 미출석자 수</span>
                    <div className="an-summary-value">
                        {absentees}<small>명</small>
                        <span className="an-summary-change negative"> ↑{absentees}</span>
                    </div>
                </div>
            </div>

            {/* 히트맵 + TOP5 */}
            <div className="an-chart-row">
                <div className="an-chart-card large">
                    <div className="an-chart-header">
                        <h3>| 요일별/시간대별 출석 분포</h3>
                        <div className="an-chart-legend">
                            <span className="an-legend-item"><span className="an-legend-dot" style={{ background: 'rgba(229,62,62,0.3)' }}></span>낮음</span>
                            <span className="an-legend-item"><span className="an-legend-dot" style={{ background: 'rgba(229,62,62,0.9)' }}></span>높음</span>
                        </div>
                    </div>
                    <div className="an-heatmap">
                        <div className="an-heatmap-header">
                            <div className="an-heatmap-corner"></div>
                            {heatmapData.dayLabels.map(d => (
                                <div key={d} className="an-heatmap-day-label">{d}</div>
                            ))}
                        </div>
                        {heatmapData.timeSlots.map((time, ti) => (
                            <div key={time} className="an-heatmap-row">
                                <div className="an-heatmap-time-label">{time}</div>
                                {heatmapData.grid[ti].map((val, di) => (
                                    <div
                                        key={di}
                                        className="an-heatmap-cell"
                                        style={{
                                            background: `rgba(229, 62, 62, ${Math.max(0.1, val / heatmapData.maxVal)})`,
                                        }}
                                        title={`${heatmapData.dayLabels[di]} ${time}: ${val}건`}
                                    ></div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 이달의 출석왕 TOP 5 */}
                <div className="an-chart-card">
                    <h3>| 이달의 출석왕 TOP 5</h3>
                    <div className="an-top-list">
                        {topAttenders.length > 0 ? topAttenders.map((t, i) => (
                            <div key={t.id} className="an-top-item">
                                <div className="an-top-rank" style={{ background: RANK_COLORS[i] }}>
                                    {i + 1}
                                </div>
                                <div className="an-top-avatar" style={{ background: RANK_COLORS[i] }}>
                                    {t.name.charAt(0)}
                                </div>
                                <div className="an-top-info">
                                    <span className="an-top-name">{t.name} 회원</span>
                                    <div className="an-top-bar-wrap">
                                        <div className="an-top-bar" style={{ width: `${t.rate}%`, background: RANK_COLORS[i] }}></div>
                                    </div>
                                </div>
                                <span className="an-top-rate" style={{ color: RANK_COLORS[i] }}>{t.rate}%</span>
                            </div>
                        )) : (
                            <p className="an-empty-text">출석 데이터가 없습니다</p>
                        )}
                    </div>
                </div>
            </div>

            {/* 월간 출석율 달성 추이 */}
            <div className="an-chart-card full">
                <div className="an-chart-header">
                    <h3>| 월간 출석율 달성 추이</h3>
                    <div className="an-chart-legend">
                        <span className="an-legend-item"><span className="an-legend-dot" style={{ background: '#2A3A4A' }}></span>목표치</span>
                        <span className="an-legend-item"><span className="an-legend-dot" style={{ background: '#E53E3E' }}></span>실제 출석</span>
                    </div>
                </div>
                <div className="an-bar-chart">
                    {monthlyTrend.map((m, i) => (
                        <div key={i} className="an-bar-group">
                            <div className="an-bar-container">
                                <div className="an-bar target" style={{ height: '80%' }}></div>
                                <div className="an-bar actual" style={{ height: `${m.rate}%` }}>
                                    <span className="an-bar-label">{m.rate}%</span>
                                </div>
                            </div>
                            <span className="an-bar-month">{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
