import { useState, useEffect } from 'react'
import { useSettings, updateSettings, fetchSettings } from '../../lib/useSettings'
import { useTheme } from '../../lib/useTheme'
import {
    Settings as SettingsIcon, Save, CheckCircle, AlertCircle,
    Building, FileText, Clock, CreditCard, Lock, Bell, Tv, Palette,
} from 'lucide-react'

const TABS = [
    { key: 'basic', label: '기본 정보', icon: Building },
    { key: 'theme', label: '테마', icon: Palette },
    { key: 'business', label: '사업자 정보', icon: FileText },
    { key: 'hours', label: '운영 시간', icon: Clock },
    { key: 'membership', label: '회원권', icon: CreditCard },
    { key: 'locker', label: '락커', icon: Lock },
    { key: 'notify', label: '알림', icon: Bell },
    { key: 'monitor', label: '모니터', icon: Tv },
]

const DAYS = [
    { key: 'mon', label: '월요일' },
    { key: 'tue', label: '화요일' },
    { key: 'wed', label: '수요일' },
    { key: 'thu', label: '목요일' },
    { key: 'fri', label: '금요일' },
    { key: 'sat', label: '토요일' },
    { key: 'sun', label: '일요일' },
]

export default function Settings() {
    const { settings: initialSettings, loading } = useSettings()
    const { theme, setTheme } = useTheme()
    const [tab, setTab] = useState('basic')
    const [form, setForm] = useState(initialSettings)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!loading) setForm(initialSettings)
    }, [loading, initialSettings])

    const update = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }))
        setSaved(false)
        setError('')
    }

    const updateHours = (day, field, value) => {
        setForm(prev => ({
            ...prev,
            operating_hours: {
                ...prev.operating_hours,
                [day]: { ...prev.operating_hours[day], [field]: value },
            },
        }))
        setSaved(false)
    }

    const updateMembership = (idx, field, value) => {
        const arr = [...(form.membership_types || [])]
        arr[idx] = { ...arr[idx], [field]: field === 'price' || field === 'duration_days' ? Number(value) : value }
        update('membership_types', arr)
    }

    const addMembership = () => {
        update('membership_types', [
            ...(form.membership_types || []),
            { name: '신규', duration_days: 30, price: 100000 },
        ])
    }

    const removeMembership = (idx) => {
        update('membership_types', form.membership_types.filter((_, i) => i !== idx))
    }

    async function handleSave() {
        setSaving(true)
        setError('')
        try {
            await updateSettings(form)
            await fetchSettings()
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            setError('저장 중 오류가 발생했습니다: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="admin-page-placeholder"><h2>로딩 중...</h2></div>
    }

    return (
        <div className="settings-page">
            {/* 헤더 */}
            <div className="settings-header">
                <div>
                    <h1 className="settings-title">
                        <SettingsIcon size={24} /> 설정
                    </h1>
                    <p className="settings-subtitle">체육관 정보, 운영 시간, 회원권 등을 관리합니다</p>
                </div>
                <button className="settings-save-btn" onClick={handleSave} disabled={saving}>
                    <Save size={16} />
                    {saving ? '저장 중...' : '저장하기'}
                </button>
            </div>

            {/* 알림 */}
            {saved && (
                <div className="settings-alert success">
                    <CheckCircle size={16} /> 저장되었습니다 — 사이트 전체에 반영됩니다
                </div>
            )}
            {error && (
                <div className="settings-alert error">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="settings-body">
                {/* 탭 사이드바 */}
                <div className="settings-tabs">
                    {TABS.map(t => {
                        const Icon = t.icon
                        return (
                            <button
                                key={t.key}
                                className={`settings-tab ${tab === t.key ? 'active' : ''}`}
                                onClick={() => setTab(t.key)}
                            >
                                <Icon size={16} />
                                <span>{t.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* 탭 콘텐츠 */}
                <div className="settings-content">
                    {tab === 'basic' && (
                        <div className="settings-section">
                            <h2>🏢 기본 정보</h2>
                            <p className="section-desc">모니터/회원 앱/공지에 표시되는 체육관 기본 정보</p>

                            <div className="settings-row">
                                <label>로고 이모지</label>
                                <input type="text" maxLength="2"
                                    value={form.gym_logo_emoji || ''}
                                    onChange={e => update('gym_logo_emoji', e.target.value)}
                                    placeholder="🥊" />
                                <span className="settings-hint">이모지 1개 (예: 🥊 🏋️ 🧘 ⛳)</span>
                            </div>

                            <div className="settings-row">
                                <label>체육관 이름 <span className="required">*</span></label>
                                <input type="text"
                                    value={form.gym_name || ''}
                                    onChange={e => update('gym_name', e.target.value)}
                                    placeholder="예: 월곡 바디복싱짐" />
                            </div>

                            <div className="settings-row">
                                <label>슬로건 (선택)</label>
                                <input type="text"
                                    value={form.gym_slogan || ''}
                                    onChange={e => update('gym_slogan', e.target.value)}
                                    placeholder="예: 함께 만드는 챔피언" />
                            </div>

                            <div className="settings-row">
                                <label>대표 전화번호</label>
                                <input type="tel"
                                    value={form.gym_phone || ''}
                                    onChange={e => update('gym_phone', e.target.value)}
                                    placeholder="010-0000-0000" />
                            </div>

                            <div className="settings-row">
                                <label>대표 이메일</label>
                                <input type="email"
                                    value={form.gym_email || ''}
                                    onChange={e => update('gym_email', e.target.value)}
                                    placeholder="contact@gym.com" />
                            </div>

                            {/* 미리보기 */}
                            <div className="settings-preview">
                                <div className="preview-title">미리보기 (모니터 화면)</div>
                                <div className="preview-monitor">
                                    {form.gym_logo_emoji} {form.gym_name || '체육관 이름'}
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'theme' && (
                        <div className="settings-section">
                            <h2>🎨 테마</h2>
                            <p className="section-desc">관리자 화면의 색상 모드를 선택하세요. 즉시 반영됩니다.</p>

                            <div className="theme-toggle-group">
                                <button
                                    type="button"
                                    className={`theme-toggle-card ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    <div className="theme-toggle-preview dark" />
                                    <div className="theme-toggle-label">🌙 다크 모드</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                        딥 차콜 + 따뜻함
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    className={`theme-toggle-card ${theme === 'light' ? 'active' : ''}`}
                                    onClick={() => setTheme('light')}
                                >
                                    <div className="theme-toggle-preview light" />
                                    <div className="theme-toggle-label">🌅 라이트 모드</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                        아이보리 베이스
                                    </div>
                                </button>
                            </div>

                            <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)' }}>
                                💡 테마 설정은 이 브라우저에만 저장됩니다. 다른 기기/브라우저에서는 다시 설정해야 해요.
                            </div>
                        </div>
                    )}

                    {tab === 'business' && (
                        <div className="settings-section">
                            <h2>📋 사업자 정보</h2>
                            <p className="section-desc">개인정보처리방침/이용약관/동의서에 자동 표시됩니다</p>

                            <div className="settings-row">
                                <label>상호 (사업자 등록명)</label>
                                <input type="text"
                                    value={form.business_name || ''}
                                    onChange={e => update('business_name', e.target.value)}
                                    placeholder="예: 바디복싱짐" />
                            </div>

                            <div className="settings-row">
                                <label>대표자 이름</label>
                                <input type="text"
                                    value={form.business_representative || ''}
                                    onChange={e => update('business_representative', e.target.value)}
                                    placeholder="홍길동" />
                            </div>

                            <div className="settings-row">
                                <label>사업자 주소</label>
                                <input type="text"
                                    value={form.business_address || ''}
                                    onChange={e => update('business_address', e.target.value)}
                                    placeholder="서울특별시 ..." />
                            </div>

                            <div className="settings-row">
                                <label>사업자등록번호</label>
                                <input type="text"
                                    value={form.business_number || ''}
                                    onChange={e => update('business_number', e.target.value)}
                                    placeholder="123-45-67890" />
                            </div>

                            <h3 style={{ marginTop: 24 }}>👤 개인정보보호책임자</h3>

                            <div className="settings-row">
                                <label>이름</label>
                                <input type="text"
                                    value={form.privacy_officer_name || ''}
                                    onChange={e => update('privacy_officer_name', e.target.value)}
                                    placeholder="대표자가 겸임 시 동일" />
                            </div>

                            <div className="settings-row">
                                <label>이메일</label>
                                <input type="email"
                                    value={form.privacy_officer_email || ''}
                                    onChange={e => update('privacy_officer_email', e.target.value)} />
                            </div>

                            <div className="settings-row">
                                <label>연락처</label>
                                <input type="tel"
                                    value={form.privacy_officer_phone || ''}
                                    onChange={e => update('privacy_officer_phone', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {tab === 'hours' && (
                        <div className="settings-section">
                            <h2>⏰ 운영 시간</h2>
                            <p className="section-desc">요일별 오픈/마감 시각. 회원 앱과 모니터에 표시됩니다</p>

                            <table className="settings-hours-table">
                                <thead>
                                    <tr>
                                        <th>요일</th>
                                        <th>오픈</th>
                                        <th>마감</th>
                                        <th>휴무</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {DAYS.map(d => {
                                        const h = form.operating_hours?.[d.key] || {}
                                        return (
                                            <tr key={d.key} className={h.closed ? 'closed' : ''}>
                                                <td>{d.label}</td>
                                                <td>
                                                    <input type="time" value={h.open || '06:00'}
                                                        disabled={h.closed}
                                                        onChange={e => updateHours(d.key, 'open', e.target.value)} />
                                                </td>
                                                <td>
                                                    <input type="time" value={h.close || '23:00'}
                                                        disabled={h.closed}
                                                        onChange={e => updateHours(d.key, 'close', e.target.value)} />
                                                </td>
                                                <td>
                                                    <label className="settings-checkbox">
                                                        <input type="checkbox" checked={h.closed || false}
                                                            onChange={e => updateHours(d.key, 'closed', e.target.checked)} />
                                                        <span>휴무</span>
                                                    </label>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {tab === 'membership' && (
                        <div className="settings-section">
                            <h2>💳 회원권 종류</h2>
                            <p className="section-desc">회원 등록 시 선택할 수 있는 회원권 옵션</p>

                            <table className="settings-membership-table">
                                <thead>
                                    <tr>
                                        <th>이름</th>
                                        <th>기간 (일)</th>
                                        <th>가격 (원)</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(form.membership_types || []).map((m, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <input type="text" value={m.name}
                                                    onChange={e => updateMembership(idx, 'name', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" value={m.duration_days}
                                                    onChange={e => updateMembership(idx, 'duration_days', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" value={m.price}
                                                    onChange={e => updateMembership(idx, 'price', e.target.value)} />
                                                <span className="settings-hint" style={{ marginLeft: 8 }}>
                                                    {Number(m.price).toLocaleString()}원
                                                </span>
                                            </td>
                                            <td>
                                                <button type="button" className="settings-remove-btn"
                                                    onClick={() => removeMembership(idx)}>삭제</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <button type="button" className="settings-add-btn" onClick={addMembership}>
                                + 회원권 추가
                            </button>
                        </div>
                    )}

                    {tab === 'locker' && (
                        <div className="settings-section">
                            <h2>🔒 락커</h2>
                            <p className="section-desc">체육관에 비치된 락커 정보</p>

                            <div className="settings-row">
                                <label>전체 락커 수</label>
                                <input type="number" min="0"
                                    value={form.locker_total_count || 0}
                                    onChange={e => update('locker_total_count', Number(e.target.value))} />
                                <span className="settings-hint">개</span>
                            </div>

                            <div className="settings-row">
                                <label>월 사용료 (원)</label>
                                <input type="number" min="0" step="1000"
                                    value={form.locker_monthly_fee || 0}
                                    onChange={e => update('locker_monthly_fee', Number(e.target.value))} />
                                <span className="settings-hint">
                                    {Number(form.locker_monthly_fee || 0).toLocaleString()}원/월
                                </span>
                            </div>
                        </div>
                    )}

                    {tab === 'notify' && (
                        <div className="settings-section">
                            <h2>🔔 알림 설정</h2>
                            <p className="section-desc">회원권 만료 알림 및 출입 통제</p>

                            <div className="settings-row">
                                <label>만료 임박 알림 (며칠 전)</label>
                                <input type="number" min="1" max="30"
                                    value={form.notify_membership_expiry_days || 7}
                                    onChange={e => update('notify_membership_expiry_days', Number(e.target.value))} />
                                <span className="settings-hint">일 전부터 관리자 화면에 알림</span>
                            </div>

                            <div className="settings-row">
                                <label>만료 회원 자동 출입 차단</label>
                                <label className="settings-toggle">
                                    <input type="checkbox" checked={form.auto_block_expired || false}
                                        onChange={e => update('auto_block_expired', e.target.checked)} />
                                    <span className="toggle-slider"></span>
                                </label>
                                <span className="settings-hint">
                                    {form.auto_block_expired
                                        ? 'ON - 만료 회원 QR 스캔 시 자동 거부'
                                        : 'OFF - 만료 회원도 출입 가능 (관리자 수동 통제)'
                                    }
                                </span>
                            </div>
                        </div>
                    )}

                    {tab === 'monitor' && (
                        <div className="settings-section">
                            <h2>📺 모니터 화면 설정</h2>
                            <p className="section-desc">체육관 TV에 표시할 슬라이드를 켜고 끌 수 있습니다</p>

                            <div className="settings-row">
                                <label>슬라이드 전환 시간 (초)</label>
                                <input type="number" min="5" max="60"
                                    value={form.monitor_slide_duration || 10}
                                    onChange={e => update('monitor_slide_duration', Number(e.target.value))} />
                                <span className="settings-hint">초마다 자동 전환</span>
                            </div>

                            <h3 style={{ marginTop: 24 }}>표시할 슬라이드</h3>

                            {[
                                { key: 'monitor_show_ranking', label: '🏆 칼로리 챔피언 랭킹' },
                                { key: 'monitor_show_realtime', label: '📊 실시간 현황' },
                                { key: 'monitor_show_intensity', label: '🔥 운동 강도 분포' },
                                { key: 'monitor_show_motivation', label: '💪 격려 메시지' },
                                { key: 'monitor_show_new_members', label: '🎉 신규 회원 환영' },
                            ].map(opt => (
                                <div className="settings-row" key={opt.key}>
                                    <label>{opt.label}</label>
                                    <label className="settings-toggle">
                                        <input type="checkbox" checked={form[opt.key] !== false}
                                            onChange={e => update(opt.key, e.target.checked)} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
