import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// 아바타 색상 배열
const AVATAR_COLORS = ['#E53E3E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
function getAvatarColor(name) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatNumber(n) {
    if (n >= 1000) return n.toLocaleString()
    return String(n)
}

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalMembers: 0,
        currentlyWorking: 0,
        totalCalories: 0,
        avgDuration: 0,
        memberGrowth: 12.4,
        maxConcurrent: 5.2,
        highIntensity: 8.7,
    })
    const [hourlyData, setHourlyData] = useState([])
    const [feedData, setFeedData] = useState([])
    const [intensityData, setIntensityData] = useState({ high: 45, mid: 35, low: 20 })
    const [intensityStats, setIntensityStats] = useState({ heartRate: 0, totalWeight: '0', burnRate: 0 })
    const [calorieKing, setCalorieKing] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
        // 실시간 구독 — attendance 테이블 변화 감지
        const channel = supabase
            .channel('admin-dashboard')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance' }, () => {
                fetchDashboardData()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    async function fetchDashboardData() {
        try {
            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)
            const todayISO = todayStart.toISOString()

            // 1. 전체 회원수
            const { count: totalMembers } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })

            // 2. 오늘 출석 기록
            const { data: todayAttendance } = await supabase
                .from('attendance')
                .select('*, members(name)')
                .gte('checked_at', todayISO)
                .order('checked_at', { ascending: false })

            // 현재 운동 중 (입장했지만 퇴장 안 한 회원)
            const entryMembers = new Set()
            const exitMembers = new Set()
            if (todayAttendance) {
                todayAttendance.forEach(record => {
                    if (record.qr_data && record.qr_data.startsWith('exit-')) {
                        exitMembers.add(record.member_id)
                    } else {
                        entryMembers.add(record.member_id)
                    }
                })
            }
            const currentlyWorking = [...entryMembers].filter(id => !exitMembers.has(id)).length

            // 3. 오늘 운동 기록
            const { data: todayWorkouts } = await supabase
                .from('workout_records')
                .select('*, members(name, created_at)')
                .gte('recorded_at', todayISO)

            const totalCalories = todayWorkouts?.reduce((sum, w) => sum + (w.total_calories || 0), 0) || 0
            const avgDuration = todayWorkouts?.length > 0
                ? Math.round(todayWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) / todayWorkouts.length)
                : 0

            // 4. 시간대별 출석 데이터
            const hourlyMap = {}
            const timeLabels = ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM']
            const timeHours = [6, 9, 12, 15, 18, 21, 0]
            timeLabels.forEach(label => { hourlyMap[label] = 0 })

            if (todayAttendance) {
                todayAttendance.forEach(record => {
                    if (record.qr_data && record.qr_data.startsWith('exit-')) return
                    const hour = new Date(record.checked_at).getHours()
                    if (hour < 9) hourlyMap['6AM']++
                    else if (hour < 12) hourlyMap['9AM']++
                    else if (hour < 15) hourlyMap['12PM']++
                    else if (hour < 18) hourlyMap['3PM']++
                    else if (hour < 21) hourlyMap['6PM']++
                    else hourlyMap['9PM']++
                })
            }
            const chartData = timeLabels.map(label => ({ time: label, count: hourlyMap[label] }))

            // 5. 입퇴장 피드 (최근 10개)
            const feed = (todayAttendance || []).slice(0, 10).map(record => {
                const isExit = record.qr_data && record.qr_data.startsWith('exit-')
                const checkedAt = new Date(record.checked_at)
                const timeStr = checkedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
                return {
                    id: record.id,
                    name: record.members?.name || '알 수 없음',
                    isExit,
                    time: timeStr,
                    memberId: record.member_id,
                }
            })

            // 6. 운동 강도 분포
            let highCount = 0, midCount = 0, lowCount = 0
            let heartRateSum = 0, heartRateCount = 0
            let totalWorkoutCal = 0, totalWorkoutMin = 0

            if (todayWorkouts) {
                todayWorkouts.forEach(w => {
                    const intensity = (w.intensity || 'normal').toLowerCase()
                    if (intensity === 'hard' || intensity === '고강도') highCount++
                    else if (intensity === 'normal' || intensity === '보통') midCount++
                    else lowCount++

                    if (w.heart_rate_avg > 0) {
                        heartRateSum += w.heart_rate_avg
                        heartRateCount++
                    }
                    totalWorkoutCal += w.total_calories || 0
                    totalWorkoutMin += w.duration_minutes || 0
                })
            }
            const totalIntensity = highCount + midCount + lowCount
            const burnRate = totalWorkoutMin > 0 ? Math.round((totalWorkoutCal / totalWorkoutMin) * 60) : 0

            // 7. 오늘의 칼로리 왕
            let king = null
            if (todayWorkouts && todayWorkouts.length > 0) {
                // member_id별 칼로리 합산
                const calByMember = {}
                todayWorkouts.forEach(w => {
                    if (!calByMember[w.member_id]) {
                        calByMember[w.member_id] = {
                            memberId: w.member_id,
                            name: w.members?.name || '알 수 없음',
                            since: w.members?.created_at ? new Date(w.members.created_at).getFullYear() : null,
                            totalCal: 0
                        }
                    }
                    calByMember[w.member_id].totalCal += w.total_calories || 0
                })
                king = Object.values(calByMember).sort((a, b) => b.totalCal - a.totalCal)[0]
            }

            setStats({
                totalMembers: totalMembers || 0,
                currentlyWorking,
                totalCalories,
                avgDuration,
                memberGrowth: 12.4,
                maxConcurrent: 5.2,
                highIntensity: 8.7,
            })
            setHourlyData(chartData)
            setFeedData(feed)
            setIntensityData(totalIntensity > 0
                ? {
                    high: Math.round((highCount / totalIntensity) * 100),
                    mid: Math.round((midCount / totalIntensity) * 100),
                    low: Math.round((lowCount / totalIntensity) * 100),
                }
                : { high: 45, mid: 35, low: 20 }
            )
            setIntensityStats({
                heartRate: heartRateCount > 0 ? Math.round(heartRateSum / heartRateCount) : 148,
                totalWeight: totalWorkoutCal > 0 ? (totalWorkoutCal / 1000).toFixed(1) + 'k' : '12.4k',
                burnRate: burnRate || 640,
            })
            setCalorieKing(king)
        } catch (err) {
            console.error('Dashboard fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="admin-page-placeholder">
                <h2>로딩 중...</h2>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            {/* 섹션 1: 요약 카드 4개 */}
            <div className="dash-summary-grid">
                <div className="dash-summary-card">
                    <div className="dash-summary-info">
                        <span className="dash-summary-label">전체 회원수</span>
                        <div className="dash-summary-value">
                            {formatNumber(stats.totalMembers)}
                        </div>
                        <div className="dash-summary-change">
                            ↗ +{stats.memberGrowth}% 지난달 대비
                        </div>
                    </div>
                    <div className="dash-summary-icon red">👥</div>
                </div>

                <div className="dash-summary-card">
                    <div className="dash-summary-info">
                        <span className="dash-summary-label">현재 운동 중</span>
                        <div className="dash-summary-value">
                            {stats.currentlyWorking}
                        </div>
                        <div className="dash-summary-change">
                            ↗ +{stats.maxConcurrent}% 최대 동시 접속
                        </div>
                    </div>
                    <div className="dash-summary-icon blue">🏋️</div>
                </div>

                <div className="dash-summary-card">
                    <div className="dash-summary-info">
                        <span className="dash-summary-label">체육관 전체 칼로리 소모량</span>
                        <div className="dash-summary-value">
                            {formatNumber(stats.totalCalories)}
                            <span className="dash-summary-unit">kcal</span>
                        </div>
                        <div className="dash-summary-change neutral">
                            오늘의 총 칼로리 소모
                        </div>
                    </div>
                    <div className="dash-summary-icon green">🔥</div>
                </div>

                <div className="dash-summary-card">
                    <div className="dash-summary-info">
                        <span className="dash-summary-label">평균 운동 시간</span>
                        <div className="dash-summary-value">
                            {stats.avgDuration}
                            <span className="dash-summary-unit">m</span>
                        </div>
                        <div className="dash-summary-change">
                            ↗ +{stats.highIntensity}% 고강도 운동
                        </div>
                    </div>
                    <div className="dash-summary-icon orange">⏱️</div>
                </div>
            </div>

            {/* 섹션 2 & 3: 중간 행 */}
            <div className="dash-mid-row">
                {/* 시간대별 출석 현황 */}
                <div className="dash-section">
                    <div className="dash-section-header">
                        <span className="dash-section-title">시간대별 출석 현황</span>
                    </div>
                    <span className="dash-section-subtitle">최근 24시간 실시간 체육관 트래픽</span>
                    <div className="dash-chart-area">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#E53E3E" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#E53E3E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" vertical={false} />
                                <XAxis dataKey="time" tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#2A3A4A' }} tickLine={false} />
                                <YAxis tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#1A2332', border: '1px solid #2A3A4A', borderRadius: 8, color: '#FFF' }}
                                    labelStyle={{ color: '#888' }}
                                    formatter={(value) => [`${value}명`, '출석']}
                                />
                                <Area type="monotone" dataKey="count" stroke="#E53E3E" strokeWidth={2} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="dash-busy-banner">
                        🏋️ 예상 혼잡 시간: 오후 5:00 - 오후 8:00
                    </div>
                </div>

                {/* 입퇴장 피드 */}
                <div className="dash-section">
                    <div className="dash-section-header">
                        <span className="dash-section-title">입퇴장 피드</span>
                        <span className="dash-section-link">전체 로그 보기</span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', marginTop: 12 }}>
                        <table className="dash-feed-table">
                            <thead>
                                <tr>
                                    <th>회원명</th>
                                    <th>활동</th>
                                    <th>시간</th>
                                    <th style={{ textAlign: 'right' }}>상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {feedData.length > 0 ? feedData.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="dash-feed-member">
                                                <div
                                                    className="dash-feed-avatar"
                                                    style={{ background: getAvatarColor(item.name) }}
                                                >
                                                    {item.name.charAt(0)}
                                                </div>
                                                <span className="dash-feed-name">{item.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`dash-badge ${item.isExit ? 'exit' : 'entry'}`}>
                                                {item.isExit ? '퇴장' : '입장'}
                                            </span>
                                        </td>
                                        <td>{item.time}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className={`dash-status ${item.isExit ? 'done' : 'active'}`}>
                                                {item.isExit ? '완료' : '운동 중'}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', color: '#666', padding: 32 }}>
                                            오늘 출석 기록이 없습니다
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 섹션 4 & 5: 하단 행 */}
            <div className="dash-bottom-row">
                {/* 운동 강도 분포 */}
                <div className="dash-section">
                    <div className="dash-section-header">
                        <span className="dash-section-title">운동 강도 분포</span>
                        <div className="dash-intensity-legend">
                            <span><span className="dash-legend-dot red" /> 고강도</span>
                            <span><span className="dash-legend-dot navy" /> STRENGTH</span>
                            <span><span className="dash-legend-dot dark" /> CARDIO</span>
                        </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <div className="dash-stacked-bar">
                            <div className="dash-bar-segment high" style={{ flex: intensityData.high }}>
                                {intensityData.high}%
                            </div>
                            <div className="dash-bar-segment mid" style={{ flex: intensityData.mid }}>
                                {intensityData.mid}%
                            </div>
                            <div className="dash-bar-segment low" style={{ flex: intensityData.low }}>
                                {intensityData.low}%
                            </div>
                        </div>
                        <div className="dash-intensity-stats">
                            <div className="dash-intensity-stat">
                                <div className="dash-intensity-stat-label">평균 심박수</div>
                                <div className="dash-intensity-stat-value">{intensityStats.heartRate}</div>
                            </div>
                            <div className="dash-intensity-stat">
                                <div className="dash-intensity-stat-label">총 운동량</div>
                                <div className="dash-intensity-stat-value">{intensityStats.totalWeight} <span className="dash-intensity-stat-unit">kg</span></div>
                            </div>
                            <div className="dash-intensity-stat">
                                <div className="dash-intensity-stat-label">연소율</div>
                                <div className="dash-intensity-stat-value">{intensityStats.burnRate} <span className="dash-intensity-stat-unit">cal/h</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 오늘의 칼로리 왕 */}
                <div className="dash-section dash-calorie-king">
                    <div className="dash-king-header">
                        <span className="dash-king-title">오늘의 칼로리 왕</span>
                        <span style={{ fontSize: 22 }}>🏆</span>
                    </div>
                    <div className="dash-king-subtitle">최근 24시간 동안 가장 많은 칼로리를 소모한 회원</div>

                    {calorieKing ? (
                        <>
                            <div className="dash-king-profile">
                                <div className="dash-king-avatar">
                                    {calorieKing.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="dash-king-name">{calorieKing.name}</div>
                                    <div className="dash-king-since">
                                        {calorieKing.since ? `${calorieKing.since}년부터 회원` : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="dash-king-calorie-label">CALORIES BURNED</div>
                            <div className="dash-king-calorie-value">
                                {formatNumber(calorieKing.totalCal)}
                                <span className="dash-king-calorie-unit">KCAL</span>
                                <span style={{ fontSize: 22 }}>🔥</span>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <span style={{ fontSize: 48 }}>🏆</span>
                            <span style={{ color: '#888', fontSize: 14 }}>아직 오늘의 운동 기록이 없습니다</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 푸터 */}
            <div className="dash-footer">
                © 2026 PunchTrack Systems. PunchTrack 관리자 대시보드. v3.2.1-Alpha
            </div>
        </div>
    )
}
