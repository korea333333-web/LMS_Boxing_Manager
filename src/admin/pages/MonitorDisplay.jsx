import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getDisplayName } from '../../utils/displayName'
import { BUSINESS_INFO } from '../../legal/PrivacyPolicy'

/**
 * 체육관 모니터/TV용 전체화면 디스플레이
 * URL: /admin/monitor (전체화면 모드)
 *
 * 표시 내용:
 * - 체육관 이름 + 현재 시각 (큰 글씨)
 * - 이번 주 칼로리 랭킹 TOP 5
 * - 지금 운동 중인 인원
 * - 평균 운동 시간
 * - 자동 새로고침 (10초마다)
 */
export default function MonitorDisplay() {
    const [now, setNow] = useState(new Date())
    const [ranking, setRanking] = useState([])
    const [stats, setStats] = useState({
        currentlyWorking: 0,
        totalToday: 0,
        avgDuration: 0,
        totalCalories: 0,
    })
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('week') // 'today' | 'week' | 'month'

    // 시계 업데이트 (1초마다)
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(t)
    }, [])

    // 데이터 fetch (10초마다)
    useEffect(() => {
        fetchData()
        const t = setInterval(fetchData, 10000)
        return () => clearInterval(t)
    }, [period])

    async function fetchData() {
        try {
            // 기간 계산
            const startDate = new Date()
            startDate.setHours(0, 0, 0, 0)
            if (period === 'week') {
                const day = startDate.getDay()
                startDate.setDate(startDate.getDate() - day) // 이번 주 일요일
            } else if (period === 'month') {
                startDate.setDate(1)
            }
            const startISO = startDate.toISOString()

            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)
            const todayISO = todayStart.toISOString()

            // 1. 운동 기록 + 회원 정보 조인
            const { data: workouts } = await supabase
                .from('workout_records')
                .select('member_id, total_calories, duration_minutes, members(name, nickname, display_mode, nickname_blocked)')
                .gte('recorded_at', startISO)

            // 2. 오늘 출석 (현재 운동 중인 인원 계산용)
            const { data: todayAttendance } = await supabase
                .from('attendance')
                .select('member_id, qr_data, checked_at')
                .gte('checked_at', todayISO)

            // 회원별 칼로리 합산
            const calByMember = {}
            workouts?.forEach(w => {
                if (!w.members) return
                if (!calByMember[w.member_id]) {
                    calByMember[w.member_id] = {
                        memberId: w.member_id,
                        member: w.members,
                        totalCal: 0,
                        totalMin: 0,
                        sessions: 0,
                    }
                }
                calByMember[w.member_id].totalCal += w.total_calories || 0
                calByMember[w.member_id].totalMin += w.duration_minutes || 0
                calByMember[w.member_id].sessions += 1
            })

            // 표시 가능한 회원만 필터 + 정렬
            const ranked = Object.values(calByMember)
                .map(r => ({
                    ...r,
                    displayName: getDisplayName(r.member),
                }))
                .filter(r => r.displayName !== null && r.totalCal > 0)
                .sort((a, b) => b.totalCal - a.totalCal)
                .slice(0, 5)

            setRanking(ranked)

            // 현재 운동 중 계산
            const entryMembers = new Set()
            const exitMembers = new Set()
            todayAttendance?.forEach(record => {
                if (record.qr_data && record.qr_data.startsWith('exit-')) {
                    exitMembers.add(record.member_id)
                } else {
                    entryMembers.add(record.member_id)
                }
            })
            const currentlyWorking = [...entryMembers].filter(id => !exitMembers.has(id)).length

            // 통계 계산
            const totalCal = workouts?.reduce((s, w) => s + (w.total_calories || 0), 0) || 0
            const totalMin = workouts?.reduce((s, w) => s + (w.duration_minutes || 0), 0) || 0
            const avgDuration = workouts?.length > 0 ? Math.round(totalMin / workouts.length) : 0

            setStats({
                currentlyWorking,
                totalToday: entryMembers.size,
                avgDuration,
                totalCalories: totalCal,
            })
        } catch (err) {
            console.error('Monitor fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    const periodLabels = { today: '오늘', week: '이번 주', month: '이번 달' }
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()]
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

    return (
        <div className="monitor-page">
            {/* 헤더 */}
            <div className="monitor-header">
                <div className="monitor-gym-name">
                    🥊 {BUSINESS_INFO.name}
                </div>
                <div className="monitor-time">
                    <div className="monitor-date">{dateStr} ({weekday})</div>
                    <div className="monitor-clock">{timeStr}</div>
                </div>
            </div>

            {/* 메인 그리드 */}
            <div className="monitor-grid">
                {/* 좌측: 랭킹 */}
                <div className="monitor-ranking">
                    <div className="monitor-section-title">
                        🏆 {periodLabels[period]} 칼로리 챔피언
                    </div>
                    {ranking.length === 0 ? (
                        <div className="monitor-empty">
                            <div style={{ fontSize: '5rem', opacity: 0.3 }}>🥊</div>
                            <div style={{ fontSize: '2rem', color: '#666', marginTop: 24 }}>
                                {loading ? '로딩 중...' : '아직 운동 기록이 없습니다'}
                            </div>
                            <div style={{ fontSize: '1.4rem', color: '#444', marginTop: 12 }}>
                                지금 운동을 시작하세요!
                            </div>
                        </div>
                    ) : (
                        <div className="monitor-rank-list">
                            {ranking.map((r, idx) => (
                                <div key={r.memberId} className={`monitor-rank-item rank-${idx + 1}`}>
                                    <div className="rank-medal">{medals[idx]}</div>
                                    <div className="rank-info">
                                        <div className="rank-name">{r.displayName}</div>
                                        <div className="rank-meta">
                                            {r.sessions}회 운동 · {r.totalMin}분
                                        </div>
                                    </div>
                                    <div className="rank-cal">
                                        <div className="rank-cal-value">
                                            {r.totalCal.toLocaleString()}
                                        </div>
                                        <div className="rank-cal-unit">kcal 🔥</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 우측: 실시간 통계 */}
                <div className="monitor-stats">
                    <div className="monitor-stat-card live">
                        <div className="stat-icon">🔥</div>
                        <div className="stat-label">지금 운동 중</div>
                        <div className="stat-value">{stats.currentlyWorking}<span>명</span></div>
                    </div>

                    <div className="monitor-stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-label">오늘 방문</div>
                        <div className="stat-value">{stats.totalToday}<span>명</span></div>
                    </div>

                    <div className="monitor-stat-card">
                        <div className="stat-icon">⏱️</div>
                        <div className="stat-label">평균 운동시간</div>
                        <div className="stat-value">{stats.avgDuration}<span>분</span></div>
                    </div>

                    <div className="monitor-stat-card highlight">
                        <div className="stat-icon">🔥</div>
                        <div className="stat-label">{periodLabels[period]} 총 칼로리</div>
                        <div className="stat-value">
                            {(stats.totalCalories / 1000).toFixed(1)}<span>k kcal</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 하단 컨트롤 (시연용, 실제 모니터에서는 숨겨도 됨) */}
            <div className="monitor-footer">
                <div className="monitor-period-tabs">
                    <button className={period === 'today' ? 'active' : ''} onClick={() => setPeriod('today')}>오늘</button>
                    <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>이번 주</button>
                    <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>이번 달</button>
                </div>
                <div className="monitor-tip">
                    💪 매일 출석하고 운동하면 챔피언이 될 수 있어요!
                </div>
                <div className="monitor-update">
                    🔄 10초마다 자동 업데이트
                </div>
            </div>
        </div>
    )
}
