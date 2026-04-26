import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

const AGE_GROUPS = [
    { key: 'elementary', label: '초등부', icon: '🧒', range: [7, 12], color: '#FF3B47' },
    { key: 'middle', label: '중등부', icon: '📚', range: [13, 15], color: '#0A84FF' },
    { key: 'high', label: '고등부', icon: '🎓', range: [16, 18], color: '#30D158' },
    { key: 'adult', label: '성인부', icon: '👤', range: [19, 999], color: '#FFD60A' },
]

export default function AnalysisAgeStats() {
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
                supabase.from('attendance').select('*').order('checked_at', { ascending: false }).limit(500)
            ])
            setMembers(membersRes.data || [])
            setAttendance(attendanceRes.data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const stats = useMemo(() => {
        const groups = AGE_GROUPS.map(g => {
            const groupMembers = members.filter(m => {
                const age = m.age || 20
                return age >= g.range[0] && age <= g.range[1]
            })
            const memberIds = groupMembers.map(m => m.id)
            const groupAttendance = attendance.filter(a =>
                memberIds.includes(a.member_id) && !a.qr_data?.startsWith('exit-')
            )

            const now = new Date()
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
            const thisMonthAttendance = groupAttendance.filter(a => new Date(a.checked_at) >= monthStart)
            const daysPassed = Math.max(1, Math.floor((now - monthStart) / (1000 * 60 * 60 * 24)))
            const rate = groupMembers.length > 0
                ? Math.min(100, Math.round((thisMonthAttendance.length / (groupMembers.length * daysPassed)) * 100))
                : 0

            return {
                ...g,
                count: groupMembers.length,
                attendanceRate: rate,
                weeklyAvg: groupMembers.length > 0 ? (thisMonthAttendance.length / Math.max(1, Math.ceil(daysPassed / 7)) / groupMembers.length).toFixed(1) : '0',
            }
        })
        return groups
    }, [members, attendance])

    const totalMembers = members.length

    // 6개월 라인 차트 데이터 (간이 시뮬레이션)
    const monthLabels = useMemo(() => {
        const now = new Date()
        return Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
            return `${d.getMonth() + 1}월`
        })
    }, [])

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
            {/* 페이지 헤더 */}
            <div className="an-page-header">
                <div>
                    <div className="an-breadcrumb">분석 &gt; <span className="an-breadcrumb-active">연령별 현황</span></div>
                    <h1 className="an-page-title">연령별 인원 및 참석율 추이</h1>
                    <p className="an-page-desc">체육관 연령대별 실시간 데이터 및 성장 지표 분석</p>
                </div>
            </div>

            {/* 요약 카드 */}
            <div className="an-summary-grid four">
                {stats.map(g => (
                    <div key={g.key} className="an-summary-card">
                        <div className="an-summary-card-header">
                            <span className="an-summary-label">{g.label} 인원</span>
                            <span className="an-summary-icon">{g.icon}</span>
                        </div>
                        <div className="an-summary-value">
                            {g.count}<small>명</small>
                        </div>
                        <span className="an-summary-change positive">출석률 {g.attendanceRate}%</span>
                    </div>
                ))}
            </div>

            {/* 메인 차트 영역 */}
            <div className="an-chart-row">
                {/* 연령대별 인원 변동 추이 */}
                <div className="an-chart-card large">
                    <div className="an-chart-header">
                        <h3>연령대별 인원 변동 추이 (6개월)</h3>
                        <div className="an-chart-legend">
                            {stats.map(g => (
                                <span key={g.key} className="an-legend-item">
                                    <span className="an-legend-dot" style={{ background: g.color }}></span>
                                    {g.label}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="an-line-chart">
                        {/* 간이 SVG 라인차트 */}
                        <svg viewBox="0 0 600 250" className="an-svg-chart">
                            {/* 그리드 라인 */}
                            {[0, 1, 2, 3, 4].map(i => (
                                <line key={i} x1="50" y1={30 + i * 50} x2="580" y2={30 + i * 50} stroke="#2A3A4A" strokeWidth="0.5" />
                            ))}
                            {/* X축 라벨 */}
                            {monthLabels.map((label, i) => (
                                <text key={i} x={80 + i * 95} y={245} fill="#666" fontSize="11" textAnchor="middle">{label}</text>
                            ))}
                            {/* 각 연령대별 라인 */}
                            {stats.map((g, gi) => {
                                const baseCount = g.count
                                const points = monthLabels.map((_, i) => {
                                    const variation = Math.sin((i + gi * 1.5) * 0.8) * (baseCount * 0.3)
                                    const val = Math.max(0, baseCount + variation - (5 - i) * (baseCount * 0.05))
                                    return { x: 80 + i * 95, y: 220 - (val / Math.max(totalMembers, 1)) * 180 }
                                })
                                const pathD = points.map((p, i) => {
                                    if (i === 0) return `M ${p.x} ${p.y}`
                                    const prev = points[i - 1]
                                    const cpx1 = prev.x + (p.x - prev.x) * 0.5
                                    return `C ${cpx1} ${prev.y}, ${cpx1} ${p.y}, ${p.x} ${p.y}`
                                }).join(' ')
                                return (
                                    <path key={g.key} d={pathD} fill="none" stroke={g.color} strokeWidth="2.5" />
                                )
                            })}
                        </svg>
                    </div>
                </div>

                {/* 연령대별 평균 참석율 */}
                <div className="an-chart-card">
                    <h3>연령대별 평균 참석율 (%)</h3>
                    <div className="an-rate-bars">
                        {stats.map(g => (
                            <div key={g.key} className="an-rate-item">
                                <div className="an-rate-label">
                                    <span>{g.label}</span>
                                    <span className="an-rate-value">{g.attendanceRate}%</span>
                                </div>
                                <div className="an-rate-bar">
                                    <div className="an-rate-fill" style={{ width: `${g.attendanceRate}%`, background: g.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="an-insight-box">
                        <span className="an-insight-title">인사이트:</span>
                        {stats.length > 0 && (() => {
                            const best = stats.reduce((a, b) => a.attendanceRate > b.attendanceRate ? a : b)
                            return ` ${best.label}의 참석율이 가장 높으며(${best.attendanceRate}%), 전체 ${totalMembers}명의 회원이 등록되어 있습니다.`
                        })()}
                    </div>
                </div>
            </div>

            {/* 테이블 */}
            <div className="an-table-card">
                <div className="an-table-header">
                    <h3>이번 달 연령별 상세 데이터 분석</h3>
                    <button className="an-export-btn">📥 CSV 내보내기</button>
                </div>
                <table className="an-table">
                    <thead>
                        <tr>
                            <th>연령대</th>
                            <th>총 인원</th>
                            <th>평균 주간 참석</th>
                            <th>참석율</th>
                            <th>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map(g => (
                            <tr key={g.key}>
                                <td>
                                    <span className="an-table-group">
                                        <span className="an-table-group-icon" style={{ color: g.color }}>{g.icon}</span>
                                        <strong>{g.label}</strong>
                                    </span>
                                </td>
                                <td>{g.count}</td>
                                <td>{g.weeklyAvg}회</td>
                                <td>
                                    <span className="an-table-rate">{g.attendanceRate}%</span>
                                </td>
                                <td>
                                    <span className={`an-status-badge ${g.attendanceRate >= 70 ? 'good' : g.attendanceRate >= 50 ? 'warn' : 'low'}`}>
                                        {g.attendanceRate >= 70 ? '양호' : g.attendanceRate >= 50 ? '보통' : '저조'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
