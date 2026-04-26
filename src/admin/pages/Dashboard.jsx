import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../lib/useSettings'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
    Users, Activity, Flame, Clock, TrendingUp, TrendingDown,
    Trophy, Sparkles, ArrowUpRight, Heart, CalendarDays, RotateCcw,
    X, ChevronRight, Smartphone,
} from 'lucide-react'

const AVATAR_COLORS = ['#FF3B47', '#0A84FF', '#30D158', '#FFD60A', '#BF5AF2', '#FF9500']

function getAvatarColor(name) {
    let hash = 0
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return String(n)
}

function pctChange(current, previous) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 1000) / 10
}

function isSameDay(a, b) {
    return a && b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
}

export default function Dashboard() {
    const navigate = useNavigate()
    const { settings } = useSettings()
    const ctx = useOutletContext() || {}
    const selectedDate = ctx.selectedDate || new Date()
    const setSelectedDate = ctx.setSelectedDate

    const today = new Date()
    const isToday = isSameDay(selectedDate, today)

    // 카드 클릭 팝업
    const [popupType, setPopupType] = useState(null) // 'working' | 'calorie' | null
    const [popupData, setPopupData] = useState([])

    const [stats, setStats] = useState({
        totalMembers: 0,
        currentlyWorking: 0,
        totalCalories: 0,
        avgDuration: 0,
        membersGrowth: 0,
        workingGrowth: 0,
        caloriesGrowth: 0,
        durationGrowth: 0,
        workingMembers: [],
        topCalorieMembers: [],
    })
    const [hourlyData, setHourlyData] = useState([])
    const [feedData, setFeedData] = useState([])
    const [intensityData, setIntensityData] = useState({ high: 0, mid: 0, low: 0 })
    const [intensityStats, setIntensityStats] = useState({ heartRate: 0, totalWeight: '0', burnRate: 0 })
    const [calorieKing, setCalorieKing] = useState(null)
    const [loading, setLoading] = useState(true)
    const [chartPeriod, setChartPeriod] = useState('today')

    useEffect(() => {
        fetchDashboardData()
        // 실시간 구독은 오늘일 때만
        if (!isToday) return
        const channel = supabase
            .channel('admin-dashboard-modern')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetchDashboardData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_records' }, fetchDashboardData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchDashboardData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, fetchDashboardData)
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [selectedDate])

    async function fetchDashboardData() {
        try {
            // 선택된 날짜를 기준으로 (기본: 오늘)
            const refDate = new Date(selectedDate)
            refDate.setHours(0, 0, 0, 0)
            const todayStart = refDate
            const todayISO = todayStart.toISOString()

            // 선택 날짜의 다음날 (해당 날짜 데이터만 가져오기)
            const dayEnd = new Date(todayStart.getTime() + 86400000)
            const dayEndISO = dayEnd.toISOString()

            const yesterdayStart = new Date(todayStart.getTime() - 86400000)
            const yesterdayISO = yesterdayStart.toISOString()

            const monthAgo = new Date()
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            const monthAgoISO = monthAgo.toISOString()

            const [{ count: totalMembers }, { count: lastMonthMembers }] = await Promise.all([
                supabase.from('members').select('*', { count: 'exact', head: true }),
                supabase.from('members').select('*', { count: 'exact', head: true }).lt('created_at', monthAgoISO),
            ])
            const membersGrowth = pctChange(totalMembers || 0, lastMonthMembers || 0)

            const [{ data: todayAttendance }, { data: yesterdayAttendance }] = await Promise.all([
                supabase.from('attendance')
                    .select('*, members(name)')
                    .gte('checked_at', todayISO)
                    .lt('checked_at', dayEndISO)
                    .order('checked_at', { ascending: false }),
                supabase.from('attendance')
                    .select('member_id, qr_data')
                    .gte('checked_at', yesterdayISO)
                    .lt('checked_at', todayISO),
            ])

            const entryToday = new Set()
            const exitToday = new Set()
            const memberLastEntry = {} // member_id → 마지막 입장 시각 + 이름
            todayAttendance?.forEach(r => {
                if (r.qr_data?.startsWith('exit-')) {
                    exitToday.add(r.member_id)
                } else {
                    entryToday.add(r.member_id)
                    if (!memberLastEntry[r.member_id]) {
                        memberLastEntry[r.member_id] = {
                            id: r.member_id,
                            name: r.members?.name || '회원',
                            checked_at: r.checked_at,
                        }
                    }
                }
            })
            const workingMemberIds = [...entryToday].filter(id => !exitToday.has(id))
            const currentlyWorking = workingMemberIds.length

            // 운동 중 회원 상세 (팝업용)
            const workingMembersList = workingMemberIds
                .map(id => memberLastEntry[id])
                .filter(Boolean)
                .sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at))

            const yesterdayEntries = new Set()
            yesterdayAttendance?.forEach(r => {
                if (!r.qr_data?.startsWith('exit-')) yesterdayEntries.add(r.member_id)
            })
            const workingGrowth = pctChange(entryToday.size, yesterdayEntries.size)

            const [{ data: todayWorkouts }, { data: yesterdayWorkouts }] = await Promise.all([
                supabase.from('workout_records')
                    .select('*, members(name, created_at)')
                    .gte('recorded_at', todayISO)
                    .lt('recorded_at', dayEndISO),
                supabase.from('workout_records')
                    .select('total_calories, duration_minutes')
                    .gte('recorded_at', yesterdayISO)
                    .lt('recorded_at', todayISO),
            ])

            const totalCalories = todayWorkouts?.reduce((s, w) => s + (w.total_calories || 0), 0) || 0
            const yesterdayCal = yesterdayWorkouts?.reduce((s, w) => s + (w.total_calories || 0), 0) || 0
            const caloriesGrowth = pctChange(totalCalories, yesterdayCal)

            const avgDuration = todayWorkouts?.length > 0
                ? Math.round(todayWorkouts.reduce((s, w) => s + (w.duration_minutes || 0), 0) / todayWorkouts.length)
                : 0
            const yesterdayAvgDur = yesterdayWorkouts?.length > 0
                ? Math.round(yesterdayWorkouts.reduce((s, w) => s + (w.duration_minutes || 0), 0) / yesterdayWorkouts.length)
                : 0
            const durationGrowth = pctChange(avgDuration, yesterdayAvgDur)

            const timeLabels = ['6시', '9시', '12시', '15시', '18시', '21시']
            const hourlyMap = {}
            timeLabels.forEach(l => { hourlyMap[l] = 0 })
            todayAttendance?.forEach(r => {
                if (r.qr_data?.startsWith('exit-')) return
                const h = new Date(r.checked_at).getHours()
                if (h < 9) hourlyMap['6시']++
                else if (h < 12) hourlyMap['9시']++
                else if (h < 15) hourlyMap['12시']++
                else if (h < 18) hourlyMap['15시']++
                else if (h < 21) hourlyMap['18시']++
                else hourlyMap['21시']++
            })
            const chartData = timeLabels.map(t => ({ time: t, count: hourlyMap[t] }))

            const feed = (todayAttendance || []).slice(0, 8).map(r => {
                const isExit = r.qr_data?.startsWith('exit-')
                const time = new Date(r.checked_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                return {
                    id: r.id,
                    name: r.members?.name || '회원',
                    isExit, time,
                    memberId: r.member_id,
                }
            })

            let high = 0, mid = 0, low = 0
            let hrSum = 0, hrCount = 0
            let totalCal = 0, totalMin = 0
            todayWorkouts?.forEach(w => {
                const i = (w.intensity || 'normal').toLowerCase()
                if (i === 'hard' || i === '고강도') high++
                else if (i === 'normal' || i === '보통') mid++
                else low++
                if (w.heart_rate_avg > 0) { hrSum += w.heart_rate_avg; hrCount++ }
                totalCal += w.total_calories || 0
                totalMin += w.duration_minutes || 0
            })
            const totalI = high + mid + low
            const burnRate = totalMin > 0 ? Math.round((totalCal / totalMin) * 60) : 0

            let king = null
            if (todayWorkouts?.length) {
                const calBy = {}
                todayWorkouts.forEach(w => {
                    if (!calBy[w.member_id]) {
                        calBy[w.member_id] = {
                            memberId: w.member_id,
                            name: w.members?.name || '회원',
                            since: w.members?.created_at ? new Date(w.members.created_at).getFullYear() : null,
                            totalCal: 0,
                        }
                    }
                    calBy[w.member_id].totalCal += w.total_calories || 0
                })
                king = Object.values(calBy).sort((a, b) => b.totalCal - a.totalCal)[0]
            }

            // 칼로리 TOP 10 (오늘)
            const calByMemberAll = {}
            todayWorkouts?.forEach(w => {
                if (!calByMemberAll[w.member_id]) {
                    calByMemberAll[w.member_id] = {
                        id: w.member_id,
                        name: w.members?.name || '회원',
                        totalCal: 0,
                        sessions: 0,
                    }
                }
                calByMemberAll[w.member_id].totalCal += w.total_calories || 0
                calByMemberAll[w.member_id].sessions += 1
            })
            const topCalorieMembers = Object.values(calByMemberAll)
                .sort((a, b) => b.totalCal - a.totalCal)
                .slice(0, 10)

            setStats({
                totalMembers: totalMembers || 0,
                currentlyWorking,
                totalCalories,
                avgDuration,
                membersGrowth, workingGrowth, caloriesGrowth, durationGrowth,
                workingMembers: workingMembersList,
                topCalorieMembers,
            })
            setHourlyData(chartData)
            setFeedData(feed)
            setIntensityData(totalI > 0
                ? { high: Math.round(high / totalI * 100), mid: Math.round(mid / totalI * 100), low: Math.round(low / totalI * 100) }
                : { high: 0, mid: 0, low: 0 })
            setIntensityStats({
                heartRate: hrCount > 0 ? Math.round(hrSum / hrCount) : 0,
                totalWeight: totalCal > 0 ? (totalCal / 1000).toFixed(1) + 'k' : '0',
                burnRate: burnRate || 0,
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
            <div className="dash-modern">
                <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    데이터 불러오는 중...
                </div>
            </div>
        )
    }

    const hour = selectedDate.getHours()
    const greeting = hour < 12 ? '좋은 아침' : hour < 18 ? '좋은 오후' : '좋은 저녁'
    const dateStr = selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })

    function renderTrend(value, label) {
        const positive = value > 0
        const negative = value < 0
        const cls = positive ? 'up' : negative ? 'down' : 'neutral'
        const Icon = positive ? TrendingUp : negative ? TrendingDown : ArrowUpRight
        const sign = value > 0 ? '+' : ''
        return (
            <div className={`stat-card-trend ${cls}`}>
                <Icon size={11} />
                <span>{sign}{value}%</span>
                <span className="stat-card-trend-text">{label}</span>
            </div>
        )
    }

    return (
        <div className="dash-modern">
            <div className="dash-modern-header">
                <div>
                    <div className="dash-modern-greeting">
                        {isToday ? (
                            <>{greeting}, <span className="dash-modern-greeting-accent">{settings.gym_name || '체육관'}</span></>
                        ) : (
                            <><span className="dash-modern-greeting-accent">📅 {dateStr}</span> 데이터</>
                        )}
                    </div>
                    <div className="dash-modern-subtitle">
                        {isToday ? (
                            <>{dateStr} · {stats.currentlyWorking > 0 ? `현재 ${stats.currentlyWorking}명이 운동 중이에요 🔥` : '오늘도 좋은 하루 되세요'}</>
                        ) : (
                            <>과거 데이터 조회 중 · 실시간 업데이트 일시 중지됨</>
                        )}
                    </div>
                </div>
                {!isToday && setSelectedDate && (
                    <button className="dash-back-today-btn" onClick={() => setSelectedDate(new Date())}>
                        <RotateCcw size={14} /> 오늘로 돌아가기
                    </button>
                )}
            </div>

            <div className="bento-grid">
                <button className="bento-card stat-card bento-3 stat-card-clickable" onClick={() => navigate('/admin/members')}>
                    <div className="stat-card-header">
                        <span className="stat-card-label">전체 회원수</span>
                        <div className="stat-card-icon accent"><Users size={18} /></div>
                    </div>
                    <div className="stat-card-value">
                        {formatNumber(stats.totalMembers)}<span className="stat-card-value-unit">명</span>
                    </div>
                    {renderTrend(stats.membersGrowth, '지난달 대비')}
                    <div className="stat-card-action">
                        회원 관리 보기 <ChevronRight size={12} />
                    </div>
                </button>

                <button
                    className="bento-card stat-card bento-3 stat-card-clickable"
                    onClick={() => stats.currentlyWorking > 0 && setPopupType('working')}
                    disabled={stats.currentlyWorking === 0}
                >
                    <div className="stat-card-header">
                        <span className="stat-card-label">현재 운동 중</span>
                        <div className="stat-card-icon info"><Activity size={18} /></div>
                    </div>
                    <div className="stat-card-value">
                        {stats.currentlyWorking}<span className="stat-card-value-unit">명</span>
                    </div>
                    {renderTrend(stats.workingGrowth, '어제 대비')}
                    {stats.currentlyWorking > 0 && (
                        <div className="stat-card-action">
                            운동 중인 회원 보기 <ChevronRight size={12} />
                        </div>
                    )}
                </button>

                <button
                    className="bento-card stat-card bento-3 stat-card-clickable"
                    onClick={() => stats.topCalorieMembers.length > 0 && setPopupType('calorie')}
                    disabled={stats.topCalorieMembers.length === 0}
                >
                    <div className="stat-card-header">
                        <span className="stat-card-label">오늘 총 칼로리</span>
                        <div className="stat-card-icon warning"><Flame size={18} /></div>
                    </div>
                    <div className="stat-card-value">
                        {formatNumber(stats.totalCalories)}<span className="stat-card-value-unit">kcal</span>
                    </div>
                    {renderTrend(stats.caloriesGrowth, '어제 대비')}
                    {stats.topCalorieMembers.length > 0 && (
                        <div className="stat-card-action">
                            랭킹 보기 <ChevronRight size={12} />
                        </div>
                    )}
                </button>

                <div className="bento-card stat-card bento-3">
                    <div className="stat-card-header">
                        <span className="stat-card-label">평균 운동시간</span>
                        <div className="stat-card-icon success"><Clock size={18} /></div>
                    </div>
                    <div className="stat-card-value">
                        {stats.avgDuration}<span className="stat-card-value-unit">분</span>
                    </div>
                    {renderTrend(stats.durationGrowth, '어제 대비')}
                </div>

                <div className="bento-card chart-card bento-8">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">시간대별 출석 트래픽</div>
                            <div className="chart-card-subtitle">오늘 회원 입장 패턴</div>
                        </div>
                        <div className="chart-card-tabs">
                            <button className={`chart-card-tab ${chartPeriod === 'today' ? 'active' : ''}`} onClick={() => setChartPeriod('today')}>오늘</button>
                            <button className={`chart-card-tab ${chartPeriod === 'week' ? 'active' : ''}`} onClick={() => setChartPeriod('week')}>이번 주</button>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="modernArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                                <XAxis dataKey="time" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: 8,
                                        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                                    }}
                                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                                    formatter={(v) => [`${v}명`, '입장']}
                                />
                                <Area type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2.5}
                                    fill="url(#modernArea)" activeDot={{ r: 6, fill: 'var(--accent)', strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bento-card champion-card bento-4 bento-row-2">
                    <div className="champion-card-content">
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '4px 10px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                            <Trophy size={12} /> 오늘의 챔피언
                        </div>

                        {calorieKing ? (
                            <>
                                <div className="champion-trophy">🏆</div>
                                <div className="champion-name">{calorieKing.name}</div>
                                <div className="champion-since">
                                    {calorieKing.since ? `${calorieKing.since}년부터 함께` : '오늘 가장 열심히'}
                                </div>
                                <div style={{ marginTop: 24 }}>
                                    <div className="champion-cal-label">CALORIES</div>
                                    <div className="champion-cal-value">
                                        {calorieKing.totalCal.toLocaleString()}
                                        <span style={{ fontSize: 18, marginLeft: 6, color: 'var(--text-tertiary)', fontWeight: 600 }}>kcal</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ paddingTop: 60, textAlign: 'center' }}>
                                <div style={{ fontSize: 48, opacity: 0.3 }}>🥊</div>
                                <div style={{ marginTop: 16, color: 'var(--text-tertiary)', fontSize: 14 }}>
                                    오늘 첫 챔피언을<br />기다리고 있어요
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bento-card intensity-card bento-4">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">오늘 운동 강도</div>
                            <div className="chart-card-subtitle">평균 강도 분포</div>
                        </div>
                    </div>
                    <div className="intensity-bar">
                        {intensityData.high > 0 && <div className="intensity-bar-segment high" style={{ flex: intensityData.high }} />}
                        {intensityData.mid > 0 && <div className="intensity-bar-segment mid" style={{ flex: intensityData.mid }} />}
                        {intensityData.low > 0 && <div className="intensity-bar-segment low" style={{ flex: intensityData.low }} />}
                        {intensityData.high + intensityData.mid + intensityData.low === 0 && (
                            <div style={{ flex: 1, background: 'var(--bg-elevated)' }} />
                        )}
                    </div>
                    <div className="intensity-legend">
                        <span className="intensity-legend-item">
                            <span className="intensity-dot high" /> 고강도 <span className="intensity-percent">{intensityData.high}%</span>
                        </span>
                        <span className="intensity-legend-item">
                            <span className="intensity-dot mid" /> 보통 <span className="intensity-percent">{intensityData.mid}%</span>
                        </span>
                        <span className="intensity-legend-item">
                            <span className="intensity-dot low" /> 저강도 <span className="intensity-percent">{intensityData.low}%</span>
                        </span>
                    </div>
                    <div className="intensity-meta">
                        <div className="intensity-meta-item">
                            <div className="intensity-meta-label"><Heart size={10} style={{ display: 'inline', marginRight: 2 }} /> 심박</div>
                            <div className="intensity-meta-value">{intensityStats.heartRate || '-'}<span className="intensity-meta-unit">bpm</span></div>
                        </div>
                        <div className="intensity-meta-item">
                            <div className="intensity-meta-label">총 칼로리</div>
                            <div className="intensity-meta-value">{intensityStats.totalWeight}</div>
                        </div>
                        <div className="intensity-meta-item">
                            <div className="intensity-meta-label">시간당</div>
                            <div className="intensity-meta-value">{intensityStats.burnRate || '-'}<span className="intensity-meta-unit">cal</span></div>
                        </div>
                    </div>
                </div>

                <div className="bento-card feed-card bento-4">
                    <div className="chart-card-header">
                        <div>
                            <div className="chart-card-title">실시간 입퇴장</div>
                            <div className="chart-card-subtitle">오늘의 활동 로그</div>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--success-soft)', color: 'var(--success)', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} /> LIVE
                        </span>
                    </div>
                    <div className="feed-list">
                        {feedData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)', fontSize: 13 }}>
                                <Sparkles size={32} style={{ opacity: 0.3, marginBottom: 12 }} /><br />
                                오늘 첫 입장을 기다리고 있어요
                            </div>
                        ) : feedData.map(f => (
                            <div key={f.id} className="feed-item">
                                <div className="feed-avatar" style={{ background: getAvatarColor(f.name) }}>
                                    {f.name.charAt(0)}
                                </div>
                                <div className="feed-info">
                                    <div className="feed-name">{f.name}</div>
                                    <div className="feed-action">{f.isExit ? '체육관 퇴장' : '체육관 입장'} · {f.time}</div>
                                </div>
                                <span className={`feed-status-pill ${f.isExit ? 'exit' : 'entry'}`}>
                                    {f.isExit ? '퇴장' : '운동 중'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* === 팝업: 운동 중 회원 / 칼로리 랭킹 === */}
            {popupType && (
                <>
                    <div className="dash-popup-overlay" onClick={() => setPopupType(null)} />
                    <div className="dash-popup">
                        <div className="dash-popup-header">
                            <div>
                                <div className="dash-popup-title">
                                    {popupType === 'working' && (
                                        <>🟢 지금 운동 중인 회원 <span className="dash-popup-count">{stats.workingMembers.length}명</span></>
                                    )}
                                    {popupType === 'calorie' && (
                                        <>🔥 오늘 칼로리 랭킹 <span className="dash-popup-count">TOP {stats.topCalorieMembers.length}</span></>
                                    )}
                                </div>
                                <div className="dash-popup-subtitle">
                                    {popupType === 'working' && '실시간 입장 회원 목록'}
                                    {popupType === 'calorie' && '오늘 칼로리 많이 태운 순서'}
                                </div>
                            </div>
                            <button className="dash-popup-close" onClick={() => setPopupType(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="dash-popup-body">
                            {popupType === 'working' && (
                                stats.workingMembers.length === 0 ? (
                                    <div className="dash-popup-empty">현재 운동 중인 회원이 없어요</div>
                                ) : (
                                    stats.workingMembers.map((m, idx) => {
                                        const enterTime = new Date(m.checked_at)
                                        const minutesAgo = Math.floor((new Date() - enterTime) / 60000)
                                        const timeStr = enterTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                                        return (
                                            <div key={m.id} className="dash-popup-item">
                                                <div className="dash-popup-avatar" style={{ background: getAvatarColor(m.name) }}>
                                                    {m.name.charAt(0)}
                                                </div>
                                                <div className="dash-popup-info">
                                                    <div className="dash-popup-name">{m.name}</div>
                                                    <div className="dash-popup-meta">
                                                        🕐 {timeStr} 입장 · {minutesAgo}분째 운동 중
                                                    </div>
                                                </div>
                                                <div className="dash-popup-status live">
                                                    <span className="dash-popup-dot" /> LIVE
                                                </div>
                                            </div>
                                        )
                                    })
                                )
                            )}

                            {popupType === 'calorie' && (
                                stats.topCalorieMembers.length === 0 ? (
                                    <div className="dash-popup-empty">오늘 운동 기록이 없어요</div>
                                ) : (
                                    stats.topCalorieMembers.map((m, idx) => {
                                        const medals = ['🥇', '🥈', '🥉']
                                        return (
                                            <div key={m.id} className={`dash-popup-item ${idx < 3 ? 'top' : ''}`}>
                                                <div className="dash-popup-rank">
                                                    {medals[idx] || `${idx + 1}`}
                                                </div>
                                                <div className="dash-popup-avatar" style={{ background: getAvatarColor(m.name) }}>
                                                    {m.name.charAt(0)}
                                                </div>
                                                <div className="dash-popup-info">
                                                    <div className="dash-popup-name">{m.name}</div>
                                                    <div className="dash-popup-meta">
                                                        {m.sessions}회 운동
                                                    </div>
                                                </div>
                                                <div className="dash-popup-cal">
                                                    {m.totalCal.toLocaleString()}<span>kcal</span>
                                                </div>
                                            </div>
                                        )
                                    })
                                )
                            )}
                        </div>

                        {popupType === 'working' && stats.workingMembers.length > 0 && (
                            <div className="dash-popup-footer">
                                <button className="dash-popup-action" onClick={() => { setPopupType(null); navigate('/admin/members') }}>
                                    전체 회원 관리에서 보기 <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
