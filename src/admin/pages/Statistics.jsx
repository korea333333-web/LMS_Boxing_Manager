import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const PIE_COLORS = ['#FF3B47', '#0A84FF', '#30D158', '#FFD60A', '#BF5AF2']
const GENDER_COLORS = { male: '#0A84FF', female: '#FF9500' }
const AGE_COLOR = '#FF3B47'

export default function Statistics() {
    const [loading, setLoading] = useState(true)
    const [revenueData, setRevenueData] = useState([])
    const [genderData, setGenderData] = useState([])
    const [ageData, setAgeData] = useState([])
    const [attendanceData, setAttendanceData] = useState([])
    const [membershipData, setMembershipData] = useState([])
    const [summaryStats, setSummaryStats] = useState({
        totalRevenue: 0,
        avgMonthly: 0,
        totalAttendance: 0,
        activeMembers: 0,
    })

    useEffect(() => {
        fetchStatistics()
    }, [])

    async function fetchStatistics() {
        try {
            await Promise.all([
                fetchRevenue(),
                fetchMemberDistribution(),
                fetchAttendanceTrend(),
                fetchMembershipStats(),
            ])
        } catch (err) {
            console.error('Stats fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    // 1. 월별 매출
    async function fetchRevenue() {
        const { data } = await supabase
            .from('payments')
            .select('amount, paid_at')
            .order('paid_at', { ascending: true })

        if (!data || data.length === 0) {
            // 데이터 없으면 최근 6개월 빈 차트
            const months = []
            for (let i = 5; i >= 0; i--) {
                const d = new Date()
                d.setMonth(d.getMonth() - i)
                months.push({ month: `${d.getMonth() + 1}월`, revenue: 0 })
            }
            setRevenueData(months)
            return
        }

        const monthlyMap = {}
        data.forEach(p => {
            const date = new Date(p.paid_at)
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            monthlyMap[key] = (monthlyMap[key] || 0) + (p.amount || 0)
        })

        const sorted = Object.entries(monthlyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([key, val]) => {
                const [, m] = key.split('-')
                return { month: `${parseInt(m)}월`, revenue: val }
            })

        setRevenueData(sorted)
        const totalRevenue = sorted.reduce((s, r) => s + r.revenue, 0)
        const avgMonthly = sorted.length > 0 ? Math.round(totalRevenue / sorted.length) : 0
        setSummaryStats(prev => ({ ...prev, totalRevenue, avgMonthly }))
    }

    // 2. 회원 분포 (성별 + 나이대)
    async function fetchMemberDistribution() {
        const { data } = await supabase
            .from('members')
            .select('gender, age')

        if (!data || data.length === 0) {
            setGenderData([
                { name: '남성', value: 0 },
                { name: '여성', value: 0 },
            ])
            setAgeData([])
            return
        }

        // 성별
        const genderCount = { male: 0, female: 0, unknown: 0 }
        const ageGroups = { '10대': 0, '20대': 0, '30대': 0, '40대': 0, '50+': 0 }

        data.forEach(m => {
            if (m.gender === 'male') genderCount.male++
            else if (m.gender === 'female') genderCount.female++
            else genderCount.unknown++

            if (m.age) {
                if (m.age < 20) ageGroups['10대']++
                else if (m.age < 30) ageGroups['20대']++
                else if (m.age < 40) ageGroups['30대']++
                else if (m.age < 50) ageGroups['40대']++
                else ageGroups['50+']++
            }
        })

        const gd = []
        if (genderCount.male > 0) gd.push({ name: '남성', value: genderCount.male })
        if (genderCount.female > 0) gd.push({ name: '여성', value: genderCount.female })
        if (genderCount.unknown > 0) gd.push({ name: '미설정', value: genderCount.unknown })
        setGenderData(gd.length > 0 ? gd : [{ name: '데이터 없음', value: 1 }])

        setAgeData(Object.entries(ageGroups).map(([name, value]) => ({ name, count: value })))
    }

    // 3. 출석 추이 (최근 30일)
    async function fetchAttendanceTrend() {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        thirtyDaysAgo.setHours(0, 0, 0, 0)

        const { data } = await supabase
            .from('attendance')
            .select('checked_at, qr_data')
            .gte('checked_at', thirtyDaysAgo.toISOString())

        // 일별 카운트 (입장만)
        const dayMap = {}
        for (let i = 29; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const key = `${d.getMonth() + 1}/${d.getDate()}`
            dayMap[key] = 0
        }

        let totalAtt = 0
        if (data) {
            data.forEach(a => {
                if (a.qr_data && a.qr_data.startsWith('exit-')) return
                const d = new Date(a.checked_at)
                const key = `${d.getMonth() + 1}/${d.getDate()}`
                if (dayMap[key] !== undefined) {
                    dayMap[key]++
                    totalAtt++
                }
            })
        }

        setAttendanceData(Object.entries(dayMap).map(([date, count]) => ({ date, count })))
        setSummaryStats(prev => ({ ...prev, totalAttendance: totalAtt }))
    }

    // 4. 회원권 현황
    async function fetchMembershipStats() {
        const { data } = await supabase
            .from('memberships')
            .select('type, status, end_date')

        if (!data || data.length === 0) {
            setMembershipData([
                { type: '1개월', active: 0, expired: 0 },
                { type: '3개월', active: 0, expired: 0 },
                { type: '6개월', active: 0, expired: 0 },
                { type: '1년', active: 0, expired: 0 },
            ])
            return
        }

        const typeMap = {}
        const now = new Date()
        let activeCount = 0

        data.forEach(ms => {
            const type = ms.type || '기타'
            if (!typeMap[type]) typeMap[type] = { active: 0, expired: 0 }

            const endDate = new Date(ms.end_date)
            if (endDate >= now) {
                typeMap[type].active++
                activeCount++
            } else {
                typeMap[type].expired++
            }
        })

        const order = ['1개월', '3개월', '6개월', '1년']
        const sorted = order.map(type => ({
            type,
            active: typeMap[type]?.active || 0,
            expired: typeMap[type]?.expired || 0,
        }))

        setMembershipData(sorted)
        setSummaryStats(prev => ({ ...prev, activeMembers: activeCount }))
    }

    const CustomTooltipStyle = {
        background: '#1A2332',
        border: '1px solid #2A3A4A',
        borderRadius: 8,
        color: '#FFF',
        fontSize: 13,
    }

    if (loading) {
        return (
            <div className="admin-page-placeholder">
                <h2>통계 로딩 중...</h2>
            </div>
        )
    }

    return (
        <div className="stats-page">
            {/* 헤더 */}
            <div className="stats-header">
                <h1 className="stats-title">📈 통계</h1>
                <span className="stats-subtitle">체육관 운영 현황을 한눈에 확인하세요</span>
            </div>

            {/* 요약 카드 */}
            <div className="stats-summary-grid">
                <div className="stats-summary-card">
                    <div className="stats-summary-icon" style={{ background: 'rgba(229, 62, 62, 0.15)' }}>💰</div>
                    <div className="stats-summary-info">
                        <span className="stats-summary-label">총 매출</span>
                        <span className="stats-summary-value">{summaryStats.totalRevenue.toLocaleString()}원</span>
                    </div>
                </div>
                <div className="stats-summary-card">
                    <div className="stats-summary-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>📊</div>
                    <div className="stats-summary-info">
                        <span className="stats-summary-label">월 평균 매출</span>
                        <span className="stats-summary-value">{summaryStats.avgMonthly.toLocaleString()}원</span>
                    </div>
                </div>
                <div className="stats-summary-card">
                    <div className="stats-summary-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>🏃</div>
                    <div className="stats-summary-info">
                        <span className="stats-summary-label">30일 총 출석</span>
                        <span className="stats-summary-value">{summaryStats.totalAttendance}회</span>
                    </div>
                </div>
                <div className="stats-summary-card">
                    <div className="stats-summary-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>✅</div>
                    <div className="stats-summary-info">
                        <span className="stats-summary-label">활성 회원권</span>
                        <span className="stats-summary-value">{summaryStats.activeMembers}건</span>
                    </div>
                </div>
            </div>

            {/* 차트 행 1: 매출 + 출석 */}
            <div className="stats-chart-row">
                {/* 월별 매출 */}
                <div className="stats-chart-card">
                    <div className="stats-chart-header">
                        <span className="stats-chart-title">💰 월별 매출</span>
                        <span className="stats-chart-subtitle">최근 6개월</span>
                    </div>
                    <div className="stats-chart-area">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#2A3A4A' }} tickLine={false} />
                                <YAxis
                                    tick={{ fill: '#888', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => v >= 10000 ? `${v / 10000}만` : v >= 1000 ? `${v / 1000}천` : v}
                                />
                                <Tooltip
                                    contentStyle={CustomTooltipStyle}
                                    formatter={(value) => [`${value.toLocaleString()}원`, '매출']}
                                />
                                <Bar dataKey="revenue" fill="#FF3B47" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 출석 추이 */}
                <div className="stats-chart-card">
                    <div className="stats-chart-header">
                        <span className="stats-chart-title">📅 출석 추이</span>
                        <span className="stats-chart-subtitle">최근 30일</span>
                    </div>
                    <div className="stats-chart-area">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0A84FF" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#888', fontSize: 10 }}
                                    axisLine={{ stroke: '#2A3A4A' }}
                                    tickLine={false}
                                    interval={4}
                                />
                                <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={CustomTooltipStyle}
                                    formatter={(value) => [`${value}명`, '출석']}
                                />
                                <Area type="monotone" dataKey="count" stroke="#0A84FF" strokeWidth={2} fill="url(#colorAtt)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 차트 행 2: 회원분포 + 회원권 현황 */}
            <div className="stats-chart-row">
                {/* 성별 분포 */}
                <div className="stats-chart-card stats-chart-small">
                    <div className="stats-chart-header">
                        <span className="stats-chart-title">👥 성별 분포</span>
                    </div>
                    <div className="stats-pie-area">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {genderData.map((entry, i) => (
                                        <Cell
                                            key={i}
                                            fill={entry.name === '남성' ? GENDER_COLORS.male
                                                : entry.name === '여성' ? GENDER_COLORS.female
                                                    : '#4B5563'}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={CustomTooltipStyle} formatter={(v) => [`${v}명`]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="stats-pie-legend">
                            {genderData.map((g, i) => (
                                <span key={i} className="stats-pie-legend-item">
                                    <span
                                        className="stats-pie-legend-dot"
                                        style={{
                                            background: g.name === '남성' ? GENDER_COLORS.male
                                                : g.name === '여성' ? GENDER_COLORS.female
                                                    : '#4B5563'
                                        }}
                                    />
                                    {g.name}: {g.value}명
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 나이대 분포 */}
                <div className="stats-chart-card stats-chart-small">
                    <div className="stats-chart-header">
                        <span className="stats-chart-title">🎂 나이대 분포</span>
                    </div>
                    <div className="stats-chart-area stats-bar-short">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#2A3A4A' }} tickLine={false} />
                                <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={CustomTooltipStyle}
                                    formatter={(value) => [`${value}명`, '회원 수']}
                                />
                                <Bar dataKey="count" fill={AGE_COLOR} radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 회원권 현황 */}
                <div className="stats-chart-card stats-chart-small">
                    <div className="stats-chart-header">
                        <span className="stats-chart-title">💳 회원권 현황</span>
                    </div>
                    <div className="stats-membership-list">
                        {membershipData.map((m, i) => {
                            const total = m.active + m.expired
                            const ratio = total > 0 ? Math.round((m.active / total) * 100) : 0
                            return (
                                <div key={i} className="stats-membership-item">
                                    <div className="stats-membership-header">
                                        <span className="stats-membership-type">{m.type}</span>
                                        <span className="stats-membership-count">{total}건</span>
                                    </div>
                                    <div className="stats-membership-bar">
                                        <div
                                            className="stats-membership-bar-fill"
                                            style={{ width: `${ratio}%` }}
                                        />
                                    </div>
                                    <div className="stats-membership-detail">
                                        <span className="stats-membership-active">활성 {m.active}</span>
                                        <span className="stats-membership-expired">만료 {m.expired}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* 푸터 */}
            <div className="dash-footer">
                © 2026 PunchTrack Systems. 통계 페이지 v1.0
            </div>
        </div>
    )
}
