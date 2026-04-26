import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

const AGE_BRACKETS = [
    { key: '10s', label: '10대 (Teenagers)', range: [10, 19], color: '#FF3B47' },
    { key: '20s', label: '20대 (Young Adults)', range: [20, 29], color: '#F97316' },
    { key: '30s', label: '30대 (Professionals)', range: [30, 39], color: '#0A84FF' },
    { key: '40+', label: '40대+ (Seniors/Vets)', range: [40, 999], color: '#6B7280' },
]

export default function AnalysisDemographics() {
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

    const totalMembers = members.length

    // 도넛 차트 데이터
    const donutData = useMemo(() => {
        return AGE_BRACKETS.map(b => {
            const count = members.filter(m => {
                const age = m.age || 20
                return age >= b.range[0] && age <= b.range[1]
            }).length
            return {
                ...b,
                count,
                pct: totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0,
            }
        })
    }, [members, totalMembers])

    // 주요 타겟층
    const mainTarget = useMemo(() => {
        if (donutData.length === 0) return '없음'
        const best = donutData.reduce((a, b) => a.count > b.count ? a : b)
        return best.label.split(' ')[0]
    }, [donutData])

    // 출석 트렌드 (요일별)
    const weeklyTrend = useMemo(() => {
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        return days.map((d, i) => {
            const dayIdx = (i + 1) % 7
            const dayAtt = attendance.filter(a => new Date(a.checked_at).getDay() === dayIdx)
            const rate = totalMembers > 0 ? Math.min(100, Math.round((dayAtt.length / totalMembers) * 20)) : 0
            return { label: d, rate }
        })
    }, [attendance, totalMembers])

    const avgRate = useMemo(() => {
        if (totalMembers === 0) return 0
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const thisMonth = attendance.filter(a => new Date(a.checked_at) >= monthStart)
        const daysPassed = Math.max(1, Math.floor((now - monthStart) / (1000 * 60 * 60 * 24)))
        return Math.min(100, ((thisMonth.length / (totalMembers * daysPassed)) * 100).toFixed(1))
    }, [members, attendance, totalMembers])

    // 신규 회원 유입 및 이탈율 테이블
    const churnData = useMemo(() => {
        return AGE_BRACKETS.map(b => {
            const groupMembers = members.filter(m => {
                const age = m.age || 20
                return age >= b.range[0] && age <= b.range[1]
            })
            // 간이 이탈율 (출석 없는 회원 비율)
            const noAttendance = groupMembers.filter(m => {
                return !attendance.some(a => a.member_id === m.id)
            }).length
            const churnRate = groupMembers.length > 0 ? Math.round((noAttendance / groupMembers.length) * 100) : 0
            const netGrowth = groupMembers.length - noAttendance

            return {
                ...b,
                count: groupMembers.length,
                churnRate,
                netGrowth: Math.max(0, netGrowth),
                trending: netGrowth > 0 ? 'up' : 'flat',
            }
        })
    }, [members, attendance])

    // 도넛 차트 SVG 계산
    const donutPaths = useMemo(() => {
        let startAngle = -90
        return donutData.map(d => {
            const angle = (d.pct / 100) * 360
            const endAngle = startAngle + angle
            const largeArc = angle > 180 ? 1 : 0
            const r = 80
            const cx = 120, cy = 120

            const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180)
            const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180)
            const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180)
            const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180)

            const path = d.pct >= 100
                ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
                : d.pct > 0
                    ? `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
                    : ''

            startAngle = endAngle
            return { ...d, path }
        })
    }, [donutData])

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
                    <h1 className="an-page-title">연령대 및 출석 분석</h1>
                    <p className="an-page-desc">체육관 연령별 인구 통계 및 출석 트렌드 심층 데이터</p>
                </div>
                <div className="an-header-actions">
                    <button className="an-period-btn">📅 최근 30일</button>
                    <button className="an-download-btn">📥 보고서 내보내기</button>
                </div>
            </div>

            {/* 섹션 타이틀 */}
            <div className="an-section-title">| 연령대별 분포 및 참석 패턴</div>

            {/* 도넛차트 + 출석 트렌드 */}
            <div className="an-chart-row equal">
                {/* 회원 분포 도넛 */}
                <div className="an-chart-card">
                    <div className="an-chart-header">
                        <div>
                            <span className="an-summary-label">회원 분포</span>
                            <div className="an-summary-value">{totalMembers}<small>명</small></div>
                        </div>
                        <span className="an-badge-green">+5.2% 상승</span>
                    </div>
                    <div className="an-donut-wrap">
                        <svg viewBox="0 0 240 240" className="an-donut-svg">
                            {/* 배경 원 */}
                            <circle cx="120" cy="120" r="80" fill="none" stroke="#2A3A4A" strokeWidth="30" />
                            {/* 데이터 */}
                            {donutPaths.map(d => d.path && (
                                <path key={d.key} d={d.path} fill={d.color} opacity="0.85" />
                            ))}
                            {/* 중앙 구멍 */}
                            <circle cx="120" cy="120" r="52" fill="#0F1923" />
                            <text x="120" y="115" textAnchor="middle" fill="#FFF" fontSize="20" fontWeight="800">{mainTarget}</text>
                            <text x="120" y="138" textAnchor="middle" fill="#888" fontSize="11">주요 타겟층</text>
                        </svg>
                    </div>
                    <div className="an-donut-legend">
                        {donutData.map(d => (
                            <span key={d.key} className="an-legend-item">
                                <span className="an-legend-dot" style={{ background: d.color }}></span>
                                {d.label.split(' ')[0]} ({d.pct}%)
                            </span>
                        ))}
                    </div>
                </div>

                {/* 출석 트렌드 */}
                <div className="an-chart-card">
                    <div className="an-chart-header">
                        <div>
                            <span className="an-summary-label">출석 트렌드</span>
                            <div className="an-summary-value">{avgRate}<small>%</small></div>
                        </div>
                        <span className="an-live-dot">● 실시간</span>
                    </div>
                    <div className="an-trend-chart">
                        <svg viewBox="0 0 500 200" className="an-svg-chart">
                            {/* 그리드 */}
                            {[0, 1, 2, 3].map(i => (
                                <line key={i} x1="40" y1={30 + i * 45} x2="480" y2={30 + i * 45} stroke="#2A3A4A" strokeWidth="0.5" />
                            ))}
                            {/* 웨이브 라인 */}
                            {(() => {
                                const points = weeklyTrend.map((d, i) => ({
                                    x: 60 + i * 80,
                                    y: 170 - (d.rate / 100) * 140
                                }))
                                if (points.length < 2) return null
                                const pathD = points.map((p, i) => {
                                    if (i === 0) return `M ${p.x} ${p.y}`
                                    const prev = points[i - 1]
                                    const cpx = prev.x + (p.x - prev.x) * 0.5
                                    return `C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`
                                }).join(' ')
                                return (
                                    <>
                                        <path d={pathD} fill="none" stroke="#FF3B47" strokeWidth="2.5" />
                                        {points.map((p, i) => (
                                            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#FF3B47" />
                                        ))}
                                    </>
                                )
                            })()}
                            {/* X축 라벨 */}
                            {weeklyTrend.map((d, i) => (
                                <text key={i} x={60 + i * 80} y={195} fill="#666" fontSize="11" textAnchor="middle">{d.label}</text>
                            ))}
                        </svg>
                    </div>
                </div>
            </div>

            {/* 신규 회원 유입 및 이탈율 분석 */}
            <div className="an-table-card">
                <div className="an-section-title">| 신규 회원 유입 및 이탈율 분석</div>
                <table className="an-table">
                    <thead>
                        <tr>
                            <th>연령대</th>
                            <th>신규 등록</th>
                            <th>이탈율 (CHURN)</th>
                            <th>순증가</th>
                            <th>추세</th>
                        </tr>
                    </thead>
                    <tbody>
                        {churnData.map(d => (
                            <tr key={d.key}>
                                <td><strong>{d.label}</strong></td>
                                <td>{d.count}명</td>
                                <td>
                                    <div className="an-churn-cell">
                                        <div className="an-churn-bar">
                                            <div className="an-churn-fill" style={{ width: `${d.churnRate}%`, background: d.color }}></div>
                                        </div>
                                        <span>{d.churnRate}%</span>
                                    </div>
                                </td>
                                <td><span className="an-net-growth">+{d.netGrowth}</span></td>
                                <td>
                                    <span className="an-trend-arrow">{d.trending === 'up' ? '📈' : '→'}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
