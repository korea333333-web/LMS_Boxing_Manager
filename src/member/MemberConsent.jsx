import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MemberConsent({ member, onComplete }) {
    const [consents, setConsents] = useState({
        privacy: false,
        terms: false,
        marketing: false,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const toggleAll = () => {
        const allRequired = consents.privacy && consents.terms
        const newVal = !allRequired
        setConsents({ privacy: newVal, terms: newVal, marketing: consents.marketing })
    }

    const toggle = (key) => {
        setConsents(prev => ({ ...prev, [key]: !prev[key] }))
    }

    async function handleSubmit() {
        if (!consents.privacy || !consents.terms) {
            setError('필수 항목에 모두 동의해주세요')
            return
        }
        setLoading(true)
        setError('')
        try {
            const now = new Date().toISOString()
            const { error: updateError } = await supabase
                .from('members')
                .update({
                    privacy_agreed_at: now,
                    terms_agreed_at: now,
                    marketing_agreed_at: consents.marketing ? now : null,
                })
                .eq('id', member.id)

            if (updateError) throw updateError

            // 동의 이력
            await supabase.from('member_consent_logs').insert([
                { member_id: member.id, consent_type: 'privacy', agreed: true,
                    user_agent: navigator.userAgent.slice(0, 200) },
                { member_id: member.id, consent_type: 'terms', agreed: true },
                { member_id: member.id, consent_type: 'marketing', agreed: consents.marketing },
            ])

            const updated = { ...member, privacy_agreed_at: now, terms_agreed_at: now,
                              marketing_agreed_at: consents.marketing ? now : null }
            localStorage.setItem('member_session', JSON.stringify(updated))
            onComplete(updated)
        } catch (err) {
            console.error('동의 저장 에러:', err)
            setError('동의 저장 중 오류가 발생했습니다')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="ml-page">
            <div className="ml-card" style={{ maxWidth: 460 }}>
                <div className="mc-icon">📋</div>
                <h1 className="ml-title">약관 동의</h1>
                <p className="ml-subtitle">
                    {member.name}님, 서비스 이용을 위해<br />아래 약관에 동의해주세요.
                </p>

                {error && <div className="ml-error">{error}</div>}

                <div className="mc-consent-list">
                    <label className="mc-consent-row all">
                        <input type="checkbox"
                            checked={consents.privacy && consents.terms && consents.marketing}
                            onChange={() => {
                                const all = consents.privacy && consents.terms && consents.marketing
                                const newVal = !all
                                setConsents({ privacy: newVal, terms: newVal, marketing: newVal })
                            }} />
                        <span><strong>전체 동의 (선택 항목 포함)</strong></span>
                    </label>

                    <div className="mc-divider" />

                    <label className="mc-consent-row">
                        <input type="checkbox" checked={consents.privacy} onChange={() => toggle('privacy')} />
                        <span>
                            <span className="mc-required">[필수]</span> 개인정보 수집·이용 동의
                        </span>
                        <Link to="/privacy" target="_blank" className="mc-link">보기</Link>
                    </label>

                    <label className="mc-consent-row">
                        <input type="checkbox" checked={consents.terms} onChange={() => toggle('terms')} />
                        <span>
                            <span className="mc-required">[필수]</span> 이용약관 동의
                        </span>
                        <Link to="/terms" target="_blank" className="mc-link">보기</Link>
                    </label>

                    <label className="mc-consent-row">
                        <input type="checkbox" checked={consents.marketing} onChange={() => toggle('marketing')} />
                        <span>
                            <span className="mc-optional">[선택]</span> 마케팅·이벤트 알림 수신
                        </span>
                    </label>
                </div>

                <button className="ml-btn" onClick={handleSubmit}
                    disabled={loading || !consents.privacy || !consents.terms}>
                    {loading ? '저장 중...' : '동의하고 시작하기'}
                </button>

                <p className="ml-footer-text" style={{ marginTop: 16 }}>
                    동의를 거부하실 경우 서비스 이용이 제한될 수 있습니다.
                </p>
            </div>
        </div>
    )
}
