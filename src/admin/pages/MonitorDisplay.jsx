import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { getDisplayName } from '../../utils/displayName'
import { useSettings } from '../../lib/useSettings'
import {
    AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Cell,
    PieChart, Pie, Tooltip
} from 'recharts'

/**
 * 체육관 모니터/TV용 전체화면 디스플레이 (화면보호기 컨셉)
 * URL: /monitor
 *
 * 여러 슬라이드가 자동으로 회전 (각 10초)
 * 슬라이드 1: 칼로리 챔피언 TOP 5
 * 슬라이드 2: 시간대별 출석 + 실시간 현황
 * 슬라이드 3: 운동 강도 분포
 * 슬라이드 4: 격려 메시지 + 우리 체육관 통계
 * 슬라이드 5: 전국 비교 (체육관 모이면 활성화)
 * 슬라이드 6: 신규 회원 환영
 */

const MOTIVATIONAL_QUOTES = [
    "💪 어제의 나보다 1% 더 강해지자",
    "🥊 챔피언은 매일 만들어진다",
    "🔥 땀은 거짓말하지 않는다",
    "⚡ 한계를 넘어서는 그 순간이 진짜 성장",
    "🏆 작은 습관이 챔피언을 만든다",
    "💯 시작이 반, 꾸준함이 나머지 반",
    "🥇 오늘의 한 라운드가 내일의 승리",
    "✨ 포기하지 않는 자가 강한 자다",
    "🎯 목표는 꿈이 아닌 계획이다",
    "🚀 어제의 챔피언, 오늘의 도전자",
]

export default function MonitorDisplay() {
    const { settings } = useSettings()
    const [now, setNow] = useState(new Date())
    const [currentSlide, setCurrentSlide] = useState(0)
    const [period, setPeriod] = useState('week')
    const [autoplay, setAutoplay] = useState(true)
    const [data, setData] = useState({
        ranking: [],
        currentlyWorking: 0,
        totalToday: 0,
        avgDuration: 0,
        totalCalories: 0,
        hourlyData: [],
        intensityData: { high: 0, mid: 0, low: 0 },
        avgHeartRate: 0,
        totalMembers: 0,
        newMembersWeek: [],
        weeklyTrend: 0,
    })
    const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0])

    // 설정에서 활성화된 슬라이드만 표시 (관장님이 설정 페이지에서 ON/OFF)
    const enabledSlides = []
    if (settings.monitor_show_ranking !== false) enabledSlides.push(0)
    if (settings.monitor_show_realtime !== false) enabledSlides.push(1)
    if (settings.monitor_show_intensity !== false) enabledSlides.push(2)
    if (settings.monitor_show_motivation !== false) enabledSlides.push(3)
    enabledSlides.push(4) // 회원 앱 홍보는 항상 표시
    if (settings.monitor_show_new_members !== false) enabledSlides.push(5)

    const slidesRef = useRef(enabledSlides)
    slidesRef.current = enabledSlides

    const SLIDE_DURATION = (settings.monitor_slide_duration || 10) * 1000

    // 시계 (1초)
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(t)
    }, [])

    // 자동 슬라이드 회전
    useEffect(() => {
        if (!autoplay) return
        const t = setInterval(() => {
            setCurrentSlide(prev => {
                const enabled = slidesRef.current
                const currentIdx = enabled.indexOf(prev)
                const nextIdx = (currentIdx + 1) % enabled.length
                return enabled[nextIdx]
            })
            setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)])
        }, SLIDE_DURATION)
        return () => clearInterval(t)
    }, [autoplay])

    // 데이터 fetch (15초마다)
    useEffect(() => {
        fetchAllData()
        const t = setInterval(fetchAllData, 15000)
        return () => clearInterval(t)
    }, [period])

    async function fetchAllData() {
        try {
            const startDate = new Date()
            startDate.setHours(0, 0, 0, 0)
            if (period === 'week') {
                startDate.setDate(startDate.getDate() - startDate.getDay())
            } else if (period === 'month') {
                startDate.setDate(1)
            }
            const startISO = startDate.toISOString()

            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)
            const todayISO = todayStart.toISOString()

            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)

            const [
                { data: workouts },
                { data: todayAttendance },
                { count: totalMembers },
                { data: newMembers },
            ] = await Promise.all([
                supabase.from('workout_records')
                    .select('member_id, total_calories, duration_minutes, intensity, heart_rate_avg, recorded_at, members(name, nickname, display_mode, nickname_blocked)')
                    .gte('recorded_at', startISO),
                supabase.from('attendance')
                    .select('member_id, qr_data, checked_at')
                    .gte('checked_at', todayISO),
                supabase.from('members').select('*', { count: 'exact', head: true }),
                supabase.from('members')
                    .select('id, name, nickname, display_mode, nickname_blocked, created_at')
                    .gte('created_at', weekAgo.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(5),
            ])

            // 칼로리 랭킹
            const calByMember = {}
            workouts?.forEach(w => {
                if (!w.members) return
                if (!calByMember[w.member_id]) {
                    calByMember[w.member_id] = {
                        memberId: w.member_id, member: w.members,
                        totalCal: 0, totalMin: 0, sessions: 0,
                    }
                }
                calByMember[w.member_id].totalCal += w.total_calories || 0
                calByMember[w.member_id].totalMin += w.duration_minutes || 0
                calByMember[w.member_id].sessions += 1
            })
            const ranking = Object.values(calByMember)
                .map(r => ({ ...r, displayName: getDisplayName(r.member) }))
                .filter(r => r.displayName !== null && r.totalCal > 0)
                .sort((a, b) => b.totalCal - a.totalCal)
                .slice(0, 5)

            // 현재 운동 중
            const entryMembers = new Set()
            const exitMembers = new Set()
            todayAttendance?.forEach(record => {
                if (record.qr_data?.startsWith('exit-')) {
                    exitMembers.add(record.member_id)
                } else {
                    entryMembers.add(record.member_id)
                }
            })
            const currentlyWorking = [...entryMembers].filter(id => !exitMembers.has(id)).length

            // 시간대별 출석
            const timeLabels = ['6시', '9시', '12시', '15시', '18시', '21시']
            const hourlyMap = {}
            timeLabels.forEach(l => { hourlyMap[l] = 0 })
            todayAttendance?.forEach(record => {
                if (record.qr_data?.startsWith('exit-')) return
                const h = new Date(record.checked_at).getHours()
                if (h < 9) hourlyMap['6시']++
                else if (h < 12) hourlyMap['9시']++
                else if (h < 15) hourlyMap['12시']++
                else if (h < 18) hourlyMap['15시']++
                else if (h < 21) hourlyMap['18시']++
                else hourlyMap['21시']++
            })
            const hourlyData = timeLabels.map(t => ({ time: t, count: hourlyMap[t] }))

            // 운동 강도 분포
            let high = 0, mid = 0, low = 0, hrSum = 0, hrCount = 0
            workouts?.forEach(w => {
                const i = (w.intensity || 'normal').toLowerCase()
                if (i === 'hard' || i === '고강도') high++
                else if (i === 'normal' || i === '보통') mid++
                else low++
                if (w.heart_rate_avg > 0) {
                    hrSum += w.heart_rate_avg
                    hrCount++
                }
            })
            const total = high + mid + low
            const intensityData = total > 0
                ? { high: Math.round(high / total * 100), mid: Math.round(mid / total * 100), low: Math.round(low / total * 100) }
                : { high: 0, mid: 0, low: 0 }

            const totalCal = workouts?.reduce((s, w) => s + (w.total_calories || 0), 0) || 0
            const totalMin = workouts?.reduce((s, w) => s + (w.duration_minutes || 0), 0) || 0

            setData({
                ranking,
                currentlyWorking,
                totalToday: entryMembers.size,
                avgDuration: workouts?.length > 0 ? Math.round(totalMin / workouts.length) : 0,
                totalCalories: totalCal,
                hourlyData,
                intensityData,
                avgHeartRate: hrCount > 0 ? Math.round(hrSum / hrCount) : 0,
                totalMembers: totalMembers || 0,
                newMembersWeek: (newMembers || []).map(m => ({
                    ...m, displayName: getDisplayName(m) || '○○○',
                })),
                weeklyTrend: 12, // placeholder, 실제로는 지난주 대비 계산 필요
            })
        } catch (err) {
            console.error('Monitor fetch error:', err)
        }
    }

    function nextSlide() {
        const enabled = slidesRef.current
        const idx = enabled.indexOf(currentSlide)
        setCurrentSlide(enabled[(idx + 1) % enabled.length])
    }
    function prevSlide() {
        const enabled = slidesRef.current
        const idx = enabled.indexOf(currentSlide)
        setCurrentSlide(enabled[(idx - 1 + enabled.length) % enabled.length])
    }

    const periodLabels = { today: '오늘', week: '이번 주', month: '이번 달' }
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()]
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    return (
        <div className="monitor-page">
            {/* 헤더 - 항상 표시 */}
            <div className="monitor-header">
                <div className="monitor-gym-name">{settings.gym_logo_emoji || '🥊'} {settings.gym_name || '내 체육관'}</div>
                <div className="monitor-time">
                    <div className="monitor-date">{dateStr} ({weekday})</div>
                    <div className="monitor-clock">{timeStr}</div>
                </div>
            </div>

            {/* 슬라이드 영역 */}
            <div className="monitor-slide-area">
                {currentSlide === 0 && <SlideRanking data={data} period={period} periodLabels={periodLabels} />}
                {currentSlide === 1 && <SlideRealtime data={data} />}
                {currentSlide === 2 && <SlideIntensity data={data} period={period} periodLabels={periodLabels} />}
                {currentSlide === 3 && <SlideMotivation data={data} quote={quote} period={period} periodLabels={periodLabels} />}
                {currentSlide === 4 && <SlideNationwide />}
                {currentSlide === 5 && <SlideNewMembers data={data} />}
            </div>

            {/* 푸터 컨트롤 */}
            <div className="monitor-footer">
                <div className="monitor-period-tabs">
                    <button className={period === 'today' ? 'active' : ''} onClick={() => setPeriod('today')}>오늘</button>
                    <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>이번 주</button>
                    <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>이번 달</button>
                </div>

                {/* 슬라이드 인디케이터 */}
                <div className="monitor-indicators">
                    <button className="indicator-arrow" onClick={prevSlide}>‹</button>
                    {enabledSlides.map(idx => (
                        <button
                            key={idx}
                            className={`indicator-dot ${currentSlide === idx ? 'active' : ''}`}
                            onClick={() => setCurrentSlide(idx)}
                        />
                    ))}
                    <button className="indicator-arrow" onClick={nextSlide}>›</button>
                    <button
                        className={`autoplay-btn ${autoplay ? 'on' : 'off'}`}
                        onClick={() => setAutoplay(!autoplay)}
                        title={autoplay ? '자동전환 끄기' : '자동전환 켜기'}
                    >
                        {autoplay ? '⏸' : '▶'}
                    </button>
                </div>

                <div className="monitor-update">🔄 15초 자동 업데이트</div>
            </div>
        </div>
    )
}

// ====== 개별 슬라이드 컴포넌트 ======

function SlideRanking({ data, period, periodLabels }) {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
    return (
        <div className="slide slide-ranking">
            <div className="slide-title">🏆 {periodLabels[period]} 칼로리 챔피언</div>
            {data.ranking.length === 0 ? (
                <div className="monitor-empty">
                    <div style={{ fontSize: '6rem', opacity: 0.3 }}>🥊</div>
                    <div style={{ fontSize: '2rem', color: '#666', marginTop: 24 }}>아직 운동 기록이 없습니다</div>
                </div>
            ) : (
                <div className="monitor-rank-list">
                    {data.ranking.map((r, idx) => (
                        <div key={r.memberId} className={`monitor-rank-item rank-${idx + 1}`}>
                            <div className="rank-medal">{medals[idx]}</div>
                            <div className="rank-info">
                                <div className="rank-name">{r.displayName}</div>
                                <div className="rank-meta">{r.sessions}회 · {r.totalMin}분</div>
                            </div>
                            <div className="rank-cal">
                                <div className="rank-cal-value">{r.totalCal.toLocaleString()}</div>
                                <div className="rank-cal-unit">kcal 🔥</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function SlideRealtime({ data }) {
    return (
        <div className="slide slide-realtime">
            <div className="slide-title">📊 오늘의 체육관 실시간</div>
            <div className="realtime-stats-grid">
                <div className="realtime-big-card live">
                    <div className="big-icon">🔥</div>
                    <div className="big-value">{data.currentlyWorking}</div>
                    <div className="big-label">지금 운동 중</div>
                </div>
                <div className="realtime-big-card">
                    <div className="big-icon">👥</div>
                    <div className="big-value">{data.totalToday}</div>
                    <div className="big-label">오늘 방문</div>
                </div>
                <div className="realtime-big-card">
                    <div className="big-icon">⏱️</div>
                    <div className="big-value">{data.avgDuration}<span>분</span></div>
                    <div className="big-label">평균 운동시간</div>
                </div>
            </div>
            <div className="realtime-chart">
                <div className="chart-label">시간대별 출석 현황</div>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.hourlyData}>
                        <defs>
                            <linearGradient id="colorH" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E53E3E" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#E53E3E" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="time" tick={{ fill: '#FFF', fontSize: 16 }} axisLine={{ stroke: '#444' }} />
                        <YAxis tick={{ fill: '#888', fontSize: 14 }} axisLine={false} tickLine={false} />
                        <Area type="monotone" dataKey="count" stroke="#E53E3E" strokeWidth={3} fill="url(#colorH)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

function SlideIntensity({ data, period, periodLabels }) {
    const pieData = [
        { name: '고강도', value: data.intensityData.high, color: '#E53E3E' },
        { name: '중강도', value: data.intensityData.mid, color: '#F59E0B' },
        { name: '저강도', value: data.intensityData.low, color: '#3B82F6' },
    ].filter(d => d.value > 0)
    const totalSum = pieData.reduce((s, d) => s + d.value, 0)

    return (
        <div className="slide slide-intensity">
            <div className="slide-title">🔥 {periodLabels[period]} 운동 강도 분포</div>
            <div className="intensity-content">
                <div className="intensity-pie-wrap">
                    {totalSum > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name"
                                    cx="50%" cy="50%" innerRadius={80} outerRadius={160}
                                    label={({ name, value }) => `${name} ${value}%`}
                                    labelLine={false}>
                                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="monitor-empty">
                            <div style={{ fontSize: '5rem', opacity: 0.3 }}>📊</div>
                            <div style={{ color: '#666', marginTop: 16 }}>운동 기록 데이터 부족</div>
                        </div>
                    )}
                </div>
                <div className="intensity-stats">
                    <div className="intensity-stat-card">
                        <div className="i-stat-icon">❤️</div>
                        <div className="i-stat-label">평균 심박수</div>
                        <div className="i-stat-value">{data.avgHeartRate || '--'}<span>bpm</span></div>
                    </div>
                    <div className="intensity-stat-card">
                        <div className="i-stat-icon">🔥</div>
                        <div className="i-stat-label">총 칼로리</div>
                        <div className="i-stat-value">{(data.totalCalories / 1000).toFixed(1)}<span>k kcal</span></div>
                    </div>
                    <div className="intensity-stat-card">
                        <div className="i-stat-icon">⏱️</div>
                        <div className="i-stat-label">평균 시간</div>
                        <div className="i-stat-value">{data.avgDuration}<span>분</span></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SlideMotivation({ data, quote, period, periodLabels }) {
    return (
        <div className="slide slide-motivation">
            <div className="motivation-quote">{quote}</div>
            <div className="motivation-divider">━━━━━━ ♦ ━━━━━━</div>
            <div className="motivation-stats">
                <div className="motiv-stat">
                    <div className="motiv-num">{data.totalMembers}</div>
                    <div className="motiv-text">함께 운동하는 동료</div>
                </div>
                <div className="motiv-stat">
                    <div className="motiv-num">{(data.totalCalories / 1000).toFixed(1)}<span>k</span></div>
                    <div className="motiv-text">{periodLabels[period]} 함께 태운 칼로리</div>
                </div>
                <div className="motiv-stat">
                    <div className="motiv-num">{data.totalToday}</div>
                    <div className="motiv-text">오늘 함께한 회원</div>
                </div>
            </div>
            <div className="motivation-cta">
                지금 이 순간, 당신의 한 라운드가 누군가에게는 큰 자극이 됩니다 💪
            </div>
        </div>
    )
}

function SlideNationwide() {
    return (
        <div className="slide slide-nationwide">
            <div className="slide-title">📱 내 전국 순위 확인하기</div>
            <div className="nationwide-promo">
                <div className="promo-phone">📱</div>
                <div className="promo-title">
                    회원 앱에서<br />
                    <span className="promo-highlight">"내 전국 순위"</span>를 확인하세요!
                </div>
                <div className="promo-example">
                    <div className="example-card">
                        <div className="example-label">전국 회원 중</div>
                        <div className="example-rank">🏆 156위 / 3,247명</div>
                        <div className="example-percentile">상위 5%</div>
                    </div>
                </div>
                <div className="promo-features">
                    <div className="promo-feat">🥊 본인 순위만 본인이 확인</div>
                    <div className="promo-feat">📊 종목별 / 연령별 순위</div>
                    <div className="promo-feat">📈 매주 갱신되는 랭킹</div>
                    <div className="promo-feat">🏆 전국 챔피언과의 격차</div>
                </div>
                <div className="promo-cta">
                    👉 펀치트랙 회원 앱 다운로드
                </div>
            </div>
        </div>
    )
}

function SlideNewMembers({ data }) {
    return (
        <div className="slide slide-new-members">
            <div className="slide-title">🎉 이번 주 새로운 동료들</div>
            {data.newMembersWeek.length === 0 ? (
                <div className="monitor-empty">
                    <div style={{ fontSize: '5rem', opacity: 0.3 }}>👋</div>
                    <div style={{ color: '#666', marginTop: 16 }}>이번 주 신규 회원이 없습니다</div>
                </div>
            ) : (
                <div className="new-members-grid">
                    {data.newMembersWeek.map((m, i) => (
                        <div key={m.id} className="new-member-card" style={{ animationDelay: `${i * 0.2}s` }}>
                            <div className="new-member-avatar">
                                {m.displayName.charAt(0)}
                            </div>
                            <div className="new-member-name">{m.displayName}</div>
                            <div className="new-member-welcome">환영합니다! 🥊</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
