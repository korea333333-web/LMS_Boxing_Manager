import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function MemberLogin({ onLogin }) {
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleLogin(e) {
        e.preventDefault()
        if (!phone.trim()) {
            setError('전화번호를 입력해주세요')
            return
        }
        setLoading(true)
        setError('')
        try {
            const { data, error: fetchError } = await supabase
                .from('members')
                .select('id, name, phone, age, gender')
                .eq('phone', phone.trim())
                .single()

            if (fetchError || !data) {
                setError('등록되지 않은 전화번호입니다')
                setLoading(false)
                return
            }

            localStorage.setItem('member_session', JSON.stringify(data))
            onLogin(data)
        } catch (err) {
            console.error('로그인 에러:', err)
            setError('로그인 중 오류가 발생했습니다')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="ml-page">
            <div className="ml-card">
                <div className="ml-logo">🥊</div>
                <h1 className="ml-title">바디복싱짐</h1>
                <p className="ml-subtitle">등록된 전화번호로 로그인하세요</p>

                {error && <div className="ml-error">{error}</div>}

                <form onSubmit={handleLogin} className="ml-form">
                    <div className="ml-input-wrap">
                        <span className="ml-input-icon">📱</span>
                        <input
                            type="tel"
                            className="ml-input"
                            placeholder="전화번호 (010-0000-0000)"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="ml-btn" disabled={loading}>
                        {loading ? '확인 중...' : '로그인'}
                    </button>
                </form>

                <p className="ml-footer-text">
                    아직 등록하지 않으셨나요?<br />
                    체육관 방문 시 관장님께 등록을 요청해주세요
                </p>
            </div>
        </div>
    )
}
