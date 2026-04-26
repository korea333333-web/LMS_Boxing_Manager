import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    RadialBarChart, RadialBar,
} from 'recharts'
import {
    Users, UserPlus, UserMinus, TrendingUp, TrendingDown, Calendar,
    Sparkles, Target, Award, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

const COLORS = ['#FF3B47', '#0A84FF', '#30D158', '#FFD60A', '#BF5AF2', '#FF9500']

function pctChange(current, previous) {
    if (!previous) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 1000) / 10
}

export default function AnalysisMembersTrend() {
    const [period, setPeriod] = useState('month') // 'month' | 'year'
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        members: [],
        memberships: [],
    })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            const [{ data: members }, { data: memberships }] = await Promise.all([
                supabase.from('members').select('*').order('created_at', { ascending: true }),
                supabase.from('memberships').select('*').order('end_date', { ascending: true }),
            ])
            setData({ members: members || [], memberships: memberships || [] })
        } catch (err) {
            console.error('Trend fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    // === 월별/년도별 신규/탈퇴/누적 데이터 ===
    const trendData = useMemo(() => {
        const groups = {}
        const now = new Date()
        const monthsBack = period === 'year' ? 60 : 12 // 5년 또는 12개월

        // 시작점부터 빈 그룹 생성
        for (let i = monthsBack - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = period === 'year'
                ? `${d.getFullYear()}`
                : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const label = period === 'year'
                ? `${d.getFullYear()}년`
                : `${d.getMonth() + 1}월`
            if (!groups[key]) {
                groups[key] = { key, label, newMembers: 0, churned: 0, cumulative: 0 }
            }
        }

        // 신규 가입 (created_at 기준)
        data.members.forEach(m => {
            const d = new Date(m.created_at)
            const key = period === 'year'
                ? `${d.getFullYear()}`
                : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (groups[key]) groups[key].newMembers++
        })

        // 탈퇴 추정 (회원권 만료 후 갱신 안 한 경우)
        // 회원별 마지막 회원권 만료일 + 그 이후 새 회원권 없음 = 탈퇴
        const memberLastMs = {}
        data.memberships.forEach(ms => {
            if (!memberLastMs[ms.member_id] || new Date(ms.end_date) > new Date(memberLastMs[ms.member_id].end_date)) {
                memberLastMs[ms.member_id] = ms
            }
        })
        Object.values(memberLastMs).forEach(ms => {
            const endDate = new Date(ms.end_date)
            // 만료일이 과거이고, 만료 후 30일 이상 지남 = 탈퇴 추정
            if (endDate < now && (now - endDate) > 30 * 86400000) {
                const key = period === 'year'
                    ? `${endDate.getFullYear()}`
                    : `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
                if (groups[key]) groups[key].churned++
            }
        })

        // 누적 계산
        const sorted = Object.values(groups).sort((a, b) => a.key.localeCompare(b.key))
        let cumulative = 0
        // 가입 누적 - 탈퇴 누적
        const totalBeforeFirst = data.members.filter(m => {
            const d = new Date(m.created_at)
            const firstKey = sorted[0]?.key
            const mKey = period === 'year'
                ? `${d.getFullYear()}`
                : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            return mKey < firstKey
        }).length
        cumulative = totalBeforeFirst

        return sorted.map(g => {
            cumulative += g.newMembers - g.churned
            return { ...g, cumulative, net: g.newMembers - g.churned }
        })
    }, [data, period])

    // === 통계 카드 ===
    const stats = useMemo(() => {
        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

        const thisMonth = data.members.filter(m => new Date(m.created_at) >= thisMonthStart).length
        const lastMonth = data.members.filter(m => {
            const d = new Date(m.created_at)
            return d >= lastMonthStart && d <= lastMonthEnd
        }).length

        // 활성 회원 (만료일이 오늘 이후)
        const memberLastMs = {}
        data.memberships.forEach(ms => {
            if (!memberLastMs[ms.member_id] || new Date(ms.end_date) > new Date(memberLastMs[ms.member_id].end_date)) {
                memberLastMs[ms.member_id] = ms
            }
        })
        const active = Object.values(memberLastMs).filter(ms => new Date(ms.end_date) >= now).length

        // 이번달 탈퇴 추정
        const churnedThisMonth = Object.values(memberLastMs).filter(ms => {
            const endDate = new Date(ms.end_date)
            return endDate >= thisMonthStart && endDate <= now && (now - endDate) > 30 * 86400000
        }).length

        return {
            total: data.members.length,
            active,
            thisMonthNew: thisMonth,
            lastMonthNew: lastMonth,
            growth: pctChange(thisMonth, lastMonth),
            churnedThisMonth,
        }
    }, [data])

    // === 회원권 종류별 분포 ===
    const membershipTypeData = useMemo(() => {
        const counts = {}
        const memberLastMs = {}
        data.memberships.forEach(ms => {
            if (!memberLastMs[ms.member_id] || new Date(ms.end_date) > new Date(memberLastMs[ms.member_id].end_date)) {
                memberLastMs[ms.member_id] = ms
            }
        })
        Object.values(memberLastMs).forEach(ms => {
            counts[ms.type] = (counts[ms.type] || 0) + 1
        })
        return Object.entries(counts).map(([name, value], i) => ({
            name, value, fill: COLORS[i % COLORS.length],
        }))
    }, [data])

    // === 연령별 분포 ===
    const ageDistData = useMemo(() => {
        const groups = { '7-12 (초등)': 0, '13-15 (중등)': 0, '16-18 (고등)': 0, '19-29 (청년)': 0, '30-44 (장년)': 0, '45+ (중년)': 0 }
        data.members.forEach(m => {
            const a = m.age || 0
            if (a >= 7 && a <= 12) groups['7-12 (초등)']++
            else if (a <= 15) groups['13-15 (중등)']++
            else if (a <= 18) groups['16-18 (고등)']++
            else if (a <= 29) groups['19-29 (청년)']++
            else if (a <= 44) groups['30-44 (장년)']++
            else if (a >= 45) groups['45+ (중년)']++
        })
        return Object.entries(groups).map(([name, count]) => ({ name, count }))
    }, [data])

    // === 성별 분포 ===
    const genderData = useMemo(() => {
        let male = 0, female = 0
        data.members.forEach(m => {
            if (m.gender === 'male') male++
            else if (m.gender === 'female') female++
        })
        return [
            { name: '남성', value: male, fill: '#0A84FF' },
            { name: '여성', value: female, fill: '#FF3B47' },
        ]
    }, [data])

    if (loading) {
        return (
            <div className="trend-page">
                <div className="trend-loading">
                    <div className="trend-spinner" />
                    <p>회원 추이 분석 중...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="trend-page">
            {/* 헤더 */}
            <div className="trend-header">
                <div>
                    <h1 className="trend-title">📈 회원 추이</h1>
                    <p className="trend-subtitle">시간에 따른 회원 변화 추이를 한눈에</p>
                </div>
                <div className="trend-tabs">
                    <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>월별</button>
                    <button className={period === 'year' ? 'active' : ''} onClick={() => setPeriod('year')}>년도별</button>
                </div>
            </div>

            {/* 통계 카드 4개 */}
            <div className="trend-stats">
                <div className="trend-stat-card">
                    <div className="trend-stat-icon accent"><Users size={20} /></div>
                    <div className="trend-stat-label">전체 회원</div>
                    <div className="trend-stat-value">{stats.total}<span>명</span></div>
                    <div className="trend-stat-sub">누적 가입자</div>
                </div>
                <div className="trend-stat-card">
                    <div className="trend-stat-icon success"><Target size={20} /></div>
                    <div className="trend-stat-label">활성 회원</div>
                    <div className="trend-stat-value">{stats.active}<span>명</span></div>
                    <div className="trend-stat-sub">
                        전체의 {stats.total > 0 ? Math.round(stats.active / stats.total * 100) : 0}%
                    </div>
                </div>
                <div className="trend-stat-card">
                    <div className="trend-stat-icon info"><UserPlus size={20} /></div>
                    <div className="trend-stat-label">이번 달 신규</div>
                    <div className="trend-stat-value">{stats.thisMonthNew}<span>명</span></div>
                    <div className={`trend-stat-trend ${stats.growth >= 0 ? 'up' : 'down'}`}>
                        {stats.growth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(stats.growth)}% 지난달 대비
                    </div>
                </div>
                <div className="trend-stat-card">
                    <div className="trend-stat-icon warning"><UserMinus size={20} /></div>
                    <div className="trend-stat-label">이번 달 탈퇴 추정</div>
                    <div className="trend-stat-value">{stats.churnedThisMonth}<span>명</span></div>
                    <div className="trend-stat-sub">만료 후 30일+ 미갱신</div>
                </div>
            </div>

            {/* 메인 차트 - 신규/탈퇴/누적 */}
            <div className="trend-grid">
                <div className="trend-card trend-main-chart">
                    <div className="trend-card-header">
                        <div>
                            <div className="trend-card-title">📊 신규 가입 vs 탈퇴 추이</div>
                            <div className="trend-card-subtitle">{period === 'month' ? '최근 12개월' : '최근 5년'}</div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#30D158" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#30D158" stopOpacity={0.6} />
                                </linearGradient>
                                <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#FF3B47" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#FF3B47" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 12,
                                    boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                                }}
                                cursor={{ fill: 'var(--bg-hover)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                            <Bar dataKey="newMembers" name="신규 가입" fill="url(#newGrad)" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="churned" name="탈퇴 추정" fill="url(#churnGrad)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 누적 회원수 추이 */}
                <div className="trend-card">
                    <div className="trend-card-header">
                        <div>
                            <div className="trend-card-title">📈 누적 회원수 변화</div>
                            <div className="trend-card-subtitle">전체 회원 성장 곡선</div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#FF3B47" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#FF3B47" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12 }}
                                formatter={(v) => [`${v}명`, '회원수']}
                            />
                            <Area type="monotone" dataKey="cumulative" stroke="#FF3B47" strokeWidth={3} fill="url(#cumGrad)" activeDot={{ r: 6 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* 순증감 라인 */}
                <div className="trend-card">
                    <div className="trend-card-header">
                        <div>
                            <div className="trend-card-title">📊 월별 순증감</div>
                            <div className="trend-card-subtitle">신규 - 탈퇴</div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12 }}
                                formatter={(v) => [`${v > 0 ? '+' : ''}${v}명`, '순증감']}
                            />
                            <Line
                                type="monotone"
                                dataKey="net"
                                stroke="#0A84FF"
                                strokeWidth={3}
                                dot={{ fill: '#0A84FF', r: 4 }}
                                activeDot={{ r: 7 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* 회원권 유형 */}
                <div className="trend-card">
                    <div className="trend-card-header">
                        <div>
                            <div className="trend-card-title">💳 회원권 유형 분포</div>
                            <div className="trend-card-subtitle">현재 활성 회원권 기준</div>
                        </div>
                    </div>
                    {membershipTypeData.length === 0 ? (
                        <div className="trend-empty">데이터 없음</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={membershipTypeData}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    label={({ name, value }) => `${name} ${value}`}
                                    labelLine={false}
                                >
                                    {membershipTypeData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* 연령대 분포 */}
                <div className="trend-card">
                    <div className="trend-card-header">
                        <div>
                            <div className="trend-card-title">👥 연령대 분포</div>
                            <div className="trend-card-subtitle">전체 회원 기준</div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={ageDistData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                            <Tooltip
                                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12 }}
                                formatter={(v) => [`${v}명`, '회원수']}
                                cursor={{ fill: 'var(--bg-hover)' }}
                            />
                            <Bar dataKey="count" fill="#FF3B47" radius={[0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 성별 분포 */}
                <div className="trend-card">
                    <div className="trend-card-header">
                        <div>
                            <div className="trend-card-title">⚥ 성별 분포</div>
                            <div className="trend-card-subtitle">전체 회원 비율</div>
                        </div>
                    </div>
                    {genderData.every(g => g.value === 0) ? (
                        <div className="trend-empty">데이터 없음</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={100}
                                    label={({ name, value, percent }) => `${name} ${value} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={false}
                                >
                                    {genderData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 12 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    )
}
