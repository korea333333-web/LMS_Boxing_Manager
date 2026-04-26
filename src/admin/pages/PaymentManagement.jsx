import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Search, Plus, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

const AVATAR_COLORS = ['#FF3B47', '#0A84FF', '#30D158', '#FFD60A', '#BF5AF2', '#FF9500']
function getAvatarColor(name) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatCurrency(n) {
    return '₩' + (n || 0).toLocaleString()
}

function formatDate(d) {
    if (!d) return '-'
    const date = new Date(d)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}`
}

const ITEMS_PER_PAGE = 10

export default function PaymentManagement() {
    const [payments, setPayments] = useState([])
    const [members, setMembers] = useState([])
    const [expiringMembers, setExpiringMembers] = useState([])
    const [monthlyData, setMonthlyData] = useState([])
    const [stats, setStats] = useState({ revenue: 0, count: 0, avgAmount: 0, expiringCount: 0, prevRevenue: 0, prevCount: 0 })
    const [loading, setLoading] = useState(true)

    // 필터
    const [searchQuery, setSearchQuery] = useState('')
    const [methodFilter, setMethodFilter] = useState('전체')
    const [itemFilter, setItemFilter] = useState('전체')
    const [currentPage, setCurrentPage] = useState(1)

    // 결제 등록 모달
    const [showModal, setShowModal] = useState(false)
    const [newPayment, setNewPayment] = useState({
        member_id: '', amount: '', method: 'card', item: '회원권', memo: ''
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchAllData()

        // Realtime 구독 - payments 테이블 변경 감지
        const channel = supabase
            .channel('payment-management')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                fetchAllData()
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, () => {
                fetchExpiringMembers()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    async function fetchAllData() {
        try {
            await Promise.all([
                fetchPayments(),
                fetchMembers(),
                fetchExpiringMembers(),
                fetchMonthlyRevenue(),
                fetchStats(),
            ])
        } catch (err) {
            console.error('PaymentManagement fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchPayments() {
        const { data } = await supabase
            .from('payments')
            .select('*, members(name)')
            .order('paid_at', { ascending: false })
        setPayments(data || [])
    }

    async function fetchMembers() {
        const { data } = await supabase
            .from('members')
            .select('id, name, phone')
            .order('name')
        setMembers(data || [])
    }

    async function fetchExpiringMembers() {
        const now = new Date()
        const in7Days = new Date(now)
        in7Days.setDate(in7Days.getDate() + 7)

        const { data } = await supabase
            .from('memberships')
            .select('*, members(name)')
            .eq('status', 'active')
            .lte('end_date', in7Days.toISOString().split('T')[0])
            .gte('end_date', now.toISOString().split('T')[0])
            .order('end_date', { ascending: true })

        // Also include expiring_soon status
        const { data: expiringSoon } = await supabase
            .from('memberships')
            .select('*, members(name)')
            .eq('status', 'expiring_soon')
            .order('end_date', { ascending: true })

        const combined = [...(data || []), ...(expiringSoon || [])]
        // deduplicate by id
        const unique = Array.from(new Map(combined.map(m => [m.id, m])).values())
        setExpiringMembers(unique.slice(0, 5))
    }

    async function fetchMonthlyRevenue() {
        const { data } = await supabase
            .from('payments')
            .select('amount, paid_at')
            .order('paid_at', { ascending: true })

        if (!data || data.length === 0) {
            // 더미 데이터
            const months = ['5월', '6월', '7월', '8월', '9월', '10월']
            setMonthlyData(months.map(m => ({ month: m, revenue: 0 })))
            return
        }

        const monthMap = {}
        data.forEach(p => {
            const d = new Date(p.paid_at)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const label = `${d.getMonth() + 1}월`
            if (!monthMap[key]) monthMap[key] = { month: label, revenue: 0, sortKey: key }
            monthMap[key].revenue += p.amount || 0
        })

        const sorted = Object.values(monthMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        setMonthlyData(sorted.slice(-6))
    }

    async function fetchStats() {
        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

        // 이번 달
        const { data: thisMonth } = await supabase
            .from('payments')
            .select('amount')
            .gte('paid_at', thisMonthStart)
        const revenue = thisMonth?.reduce((s, p) => s + (p.amount || 0), 0) || 0
        const count = thisMonth?.length || 0

        // 지난 달
        const { data: lastMonth } = await supabase
            .from('payments')
            .select('amount')
            .gte('paid_at', lastMonthStart)
            .lte('paid_at', lastMonthEnd)
        const prevRevenue = lastMonth?.reduce((s, p) => s + (p.amount || 0), 0) || 0
        const prevCount = lastMonth?.length || 0

        // 만료 예정
        const in7Days = new Date(now)
        in7Days.setDate(in7Days.getDate() + 7)
        const { count: expiringCount } = await supabase
            .from('memberships')
            .select('*', { count: 'exact', head: true })
            .in('status', ['active', 'expiring_soon'])
            .lte('end_date', in7Days.toISOString().split('T')[0])
            .gte('end_date', now.toISOString().split('T')[0])

        setStats({
            revenue,
            count,
            avgAmount: count > 0 ? Math.round(revenue / count) : 0,
            expiringCount: expiringCount || 0,
            prevRevenue,
            prevCount,
        })
    }

    // 필터링된 결제 내역
    const filteredPayments = payments.filter(p => {
        const name = p.members?.name || ''
        if (searchQuery && !name.includes(searchQuery)) return false
        if (methodFilter !== '전체') {
            const methodMap = { '카드': 'card', '현금': 'cash', '계좌이체': 'transfer' }
            if (p.method !== methodMap[methodFilter]) return false
        }
        if (itemFilter !== '전체' && p.item !== itemFilter) return false
        return true
    })

    const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE)
    const paginatedPayments = filteredPayments.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // 결제 수단 한글화
    function methodLabel(m) {
        if (m === 'card') return '카드'
        if (m === 'cash') return '현금'
        if (m === 'transfer') return '계좌이체'
        return m
    }

    // 결제 등록
    async function handleAddPayment() {
        if (!newPayment.member_id || !newPayment.amount) return
        setSaving(true)
        try {
            const { error } = await supabase.from('payments').insert({
                member_id: newPayment.member_id,
                amount: parseInt(newPayment.amount),
                method: newPayment.method,
                item: newPayment.item,
                memo: newPayment.memo || null,
            })
            if (error) throw error
            setShowModal(false)
            setNewPayment({ member_id: '', amount: '', method: 'card', item: '회원권', memo: '' })
            await fetchAllData()
        } catch (err) {
            console.error('결제 등록 오류:', err)
            alert('결제 등록에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // D-day 계산
    function getDDay(endDate) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(0, 0, 0, 0)
        const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
        return diff
    }

    // 매출 변화율
    const revenueChange = stats.prevRevenue > 0
        ? Math.round(((stats.revenue - stats.prevRevenue) / stats.prevRevenue) * 100)
        : (stats.revenue > 0 ? 100 : 0)

    const countChange = stats.count - stats.prevCount

    if (loading) {
        return (
            <div className="admin-page-placeholder">
                <h2>로딩 중...</h2>
            </div>
        )
    }

    return (
        <div className="pm-container">
            {/* 페이지 헤더 */}
            <div className="pm-header">
                <div>
                    <h1 className="pm-title">매출/결제 관리</h1>
                    <p className="pm-subtitle">체육관의 전체 매출 현황과 결제 내역을 실시간으로 확인합니다.</p>
                </div>
                <button className="pm-add-btn" onClick={() => setShowModal(true)}>
                    <><Plus size={16} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> 결제 등록</>
                </button>
            </div>

            {/* 요약 카드 4개 */}
            <div className="pm-summary-grid">
                <div className="pm-summary-card">
                    <div className="pm-card-top">
                        <span className="pm-card-label">이번 달 매출</span>
                        {revenueChange !== 0 && (
                            <span className={`pm-card-badge ${revenueChange >= 0 ? 'green' : 'red'}`}>
                                {revenueChange >= 0 ? '+' : ''}{revenueChange}%
                            </span>
                        )}
                    </div>
                    <p className="pm-card-value">{formatCurrency(stats.revenue)}</p>
                    <p className="pm-card-sub">
                        {stats.prevRevenue > 0
                            ? `지난 달 대비 ${formatCurrency(Math.abs(stats.revenue - stats.prevRevenue))} ${stats.revenue >= stats.prevRevenue ? '증가' : '감소'}`
                            : '이번 달 매출'}
                    </p>
                </div>

                <div className="pm-summary-card">
                    <div className="pm-card-top">
                        <span className="pm-card-label">결제 건수</span>
                        {countChange !== 0 && (
                            <span className={`pm-card-badge ${countChange >= 0 ? 'green' : 'red'}`}>
                                {countChange >= 0 ? '+' : ''}{countChange}건
                            </span>
                        )}
                    </div>
                    <p className="pm-card-value">{stats.count}건</p>
                    <p className="pm-card-sub">
                        일일 평균 {stats.count > 0 ? (stats.count / new Date().getDate()).toFixed(1) : '0'}건 결제 발생
                    </p>
                </div>

                <div className="pm-summary-card">
                    <div className="pm-card-top">
                        <span className="pm-card-label">평균 결제액</span>
                        <span className="pm-card-icon-trend"><TrendingUp size={16} /></span>
                    </div>
                    <p className="pm-card-value">{formatCurrency(stats.avgAmount)}</p>
                    <p className="pm-card-sub">건당 평균 결제 금액</p>
                </div>

                <div className="pm-summary-card">
                    <div className="pm-card-top">
                        <span className="pm-card-label">만료 예정</span>
                        <span className="pm-card-icon-warning"><AlertTriangle size={16} /></span>
                    </div>
                    <p className="pm-card-value">{stats.expiringCount}명</p>
                    <p className="pm-card-sub">향후 7일 이내 만료 예정 회원</p>
                </div>
            </div>

            {/* 중간 행: 차트 + 만료 알림 */}
            <div className="pm-mid-row">
                {/* 월별 매출 차트 */}
                <div className="pm-section pm-chart-section">
                    <div className="pm-section-header">
                        <h3 className="pm-section-title">월별 매출 추이</h3>
                        <span className="pm-legend"><span className="pm-legend-dot" /> 이번 해</span>
                    </div>
                    <div className="pm-chart-area">
                        {monthlyData.length > 0 && monthlyData.some(d => d.revenue > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 12 }} axisLine={{ stroke: '#2A3A4A' }} tickLine={false} />
                                    <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000) + 'K' : v} />
                                    <Tooltip
                                        contentStyle={{ background: '#1A2332', border: '1px solid #2A3A4A', borderRadius: 8, color: '#FFF' }}
                                        formatter={(value) => [formatCurrency(value), '매출']}
                                    />
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#FF6B6B" />
                                            <stop offset="100%" stopColor="#FF3B47" />
                                        </linearGradient>
                                    </defs>
                                    <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="pm-empty-chart">
                                <TrendingUp size={48} style={{color:'#666'}} />
                                <span style={{ color: '#666', fontSize: 14 }}>결제 데이터가 쌓이면 차트가 표시됩니다</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 만료 임박 알림 */}
                <div className="pm-section pm-alert-section">
                    <div className="pm-section-header">
                        <h3 className="pm-section-title">만료 임박 알림</h3>
                        <span className="pm-section-link">전체보기</span>
                    </div>
                    <div className="pm-alert-list">
                        {expiringMembers.length > 0 ? expiringMembers.map(m => {
                            const dday = getDDay(m.end_date)
                            const name = m.members?.name || '알 수 없음'
                            return (
                                <div key={m.id} className="pm-alert-item">
                                    <div className="pm-alert-left">
                                        <div className="pm-alert-avatar" style={{ background: getAvatarColor(name) }}>
                                            {name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="pm-alert-name">
                                                {name}
                                                <span className={`pm-dday ${dday <= 3 ? 'urgent' : dday <= 5 ? 'warn' : 'normal'}`}>
                                                    D-{dday}
                                                </span>
                                            </div>
                                            <div className="pm-alert-detail">
                                                {m.type} (잔여 {dday}일)
                                            </div>
                                        </div>
                                    </div>
                                    <button className="pm-extend-btn">연장</button>
                                </div>
                            )
                        }) : (
                            <div className="pm-alert-empty">
                                <CheckCircle size={36} style={{color:'#30D158'}} />
                                <span style={{ color: '#666', fontSize: 13 }}>7일 이내 만료 예정 회원이 없습니다</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 결제 내역 테이블 */}
            <div className="pm-table-section">
                <div className="pm-table-header">
                    <h3 className="pm-section-title">결제 내역</h3>
                    <div className="pm-filters">
                        <div className="pm-search-wrap">
                            <span className="pm-search-icon"><Search size={16} /></span>
                            <input
                                type="text"
                                className="pm-search-input"
                                placeholder="회원명 검색..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                            />
                        </div>
                        <select
                            className="pm-filter-select"
                            value={methodFilter}
                            onChange={e => { setMethodFilter(e.target.value); setCurrentPage(1) }}
                        >
                            <option>전체</option>
                            <option>카드</option>
                            <option>현금</option>
                            <option>계좌이체</option>
                        </select>
                        <select
                            className="pm-filter-select"
                            value={itemFilter}
                            onChange={e => { setItemFilter(e.target.value); setCurrentPage(1) }}
                        >
                            <option>전체</option>
                            <option>회원권</option>
                            <option>PT</option>
                            <option>기타</option>
                        </select>
                    </div>
                </div>

                <div className="pm-table-wrap">
                    <table className="pm-table">
                        <thead>
                            <tr>
                                <th>결제 일자</th>
                                <th>회원명</th>
                                <th>결제 품목</th>
                                <th className="text-right">결제 금액</th>
                                <th>수단</th>
                                <th>메모</th>
                                <th className="text-center">상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPayments.length > 0 ? paginatedPayments.map(p => (
                                <tr key={p.id}>
                                    <td>{formatDate(p.paid_at)}</td>
                                    <td className="pm-td-name">{p.members?.name || '-'}</td>
                                    <td>
                                        <span className={`pm-item-badge ${p.item === '회원권' ? 'membership' : p.item === 'PT' ? 'pt' : 'etc'}`}>
                                            {p.item}
                                        </span>
                                    </td>
                                    <td className="text-right pm-td-amount">{formatCurrency(p.amount)}</td>
                                    <td>{methodLabel(p.method)}</td>
                                    <td className="pm-td-memo">{p.memo || '-'}</td>
                                    <td className="text-center">
                                        <span className="pm-status-badge completed">결제완료</span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', color: '#666', padding: 40 }}>
                                        결제 내역이 없습니다
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                <div className="pm-pagination">
                    <span className="pm-page-info">
                        총 {filteredPayments.length}건 중 {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredPayments.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredPayments.length)}건 표시
                    </span>
                    <div className="pm-page-btns">
                        <button
                            className="pm-page-btn"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >‹</button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const page = i + 1
                            return (
                                <button
                                    key={page}
                                    className={`pm-page-btn ${page === currentPage ? 'active' : ''}`}
                                    onClick={() => setCurrentPage(page)}
                                >{page}</button>
                            )
                        })}
                        <button
                            className="pm-page-btn"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >›</button>
                    </div>
                </div>
            </div>

            {/* 결제 등록 모달 */}
            {showModal && (
                <div className="pm-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="pm-modal" onClick={e => e.stopPropagation()}>
                        <div className="pm-modal-header">
                            <h3>결제 등록</h3>
                            <button className="pm-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="pm-modal-body">
                            <div className="pm-form-group">
                                <label>회원 선택</label>
                                <select
                                    value={newPayment.member_id}
                                    onChange={e => setNewPayment({ ...newPayment, member_id: e.target.value })}
                                >
                                    <option value="">회원을 선택하세요</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pm-form-group">
                                <label>결제 항목</label>
                                <select
                                    value={newPayment.item}
                                    onChange={e => setNewPayment({ ...newPayment, item: e.target.value })}
                                >
                                    <option value="회원권">회원권</option>
                                    <option value="PT">PT</option>
                                    <option value="기타">기타</option>
                                </select>
                            </div>
                            <div className="pm-form-group">
                                <label>결제 금액 (원)</label>
                                <input
                                    type="number"
                                    placeholder="예: 300000"
                                    value={newPayment.amount}
                                    onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                                />
                            </div>
                            <div className="pm-form-group">
                                <label>결제 수단</label>
                                <select
                                    value={newPayment.method}
                                    onChange={e => setNewPayment({ ...newPayment, method: e.target.value })}
                                >
                                    <option value="card">카드</option>
                                    <option value="cash">현금</option>
                                    <option value="transfer">계좌이체</option>
                                </select>
                            </div>
                            <div className="pm-form-group">
                                <label>메모 (선택)</label>
                                <input
                                    type="text"
                                    placeholder="예: 3개월 연장"
                                    value={newPayment.memo}
                                    onChange={e => setNewPayment({ ...newPayment, memo: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="pm-modal-footer">
                            <button className="pm-modal-cancel" onClick={() => setShowModal(false)}>취소</button>
                            <button
                                className="pm-modal-submit"
                                onClick={handleAddPayment}
                                disabled={saving || !newPayment.member_id || !newPayment.amount}
                            >
                                {saving ? '등록 중...' : '결제 등록'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
