import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, User, Phone, Cake, Users as UsersIcon, UserPlus, AlertCircle, CheckCircle } from 'lucide-react'

export default function MemberRegister() {
    const navigate = useNavigate()
    const [form, setForm] = useState({
        name: '',
        phone: '',
        age: '',
        gender: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
        setError('')
        setSuccess(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess(false)

        // 유효성 검사
        if (!form.name.trim()) {
            setError('이름을 입력해주세요')
            return
        }
        if (!form.phone.trim()) {
            setError('전화번호를 입력해주세요')
            return
        }
        if (!form.age || isNaN(form.age) || Number(form.age) < 1 || Number(form.age) > 120) {
            setError('올바른 나이를 입력해주세요 (1~120)')
            return
        }
        if (!form.gender) {
            setError('성별을 선택해주세요')
            return
        }

        setLoading(true)

        try {
            // 전화번호 중복 체크
            const { data: existing } = await supabase
                .from('members')
                .select('id')
                .eq('phone', form.phone.trim())
                .single()

            if (existing) {
                setError('이미 등록된 전화번호입니다')
                setLoading(false)
                return
            }

            // 회원 등록
            const { error: insertError } = await supabase
                .from('members')
                .insert({
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    age: Number(form.age),
                    gender: form.gender,
                })

            if (insertError) {
                console.error('Insert error:', insertError)
                setError('회원 등록 중 오류가 발생했습니다')
                setLoading(false)
                return
            }

            setSuccess(true)
            setForm({ name: '', phone: '', age: '', gender: '' })
        } catch (err) {
            console.error('Register error:', err)
            setError('회원 등록 중 오류가 발생했습니다')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="register-page">
            <div className="register-container">
                {/* 헤더 */}
                <div className="register-header">
                    <button className="register-back-btn" onClick={() => navigate('/admin/members')}>
                        <><ArrowLeft size={16} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> 돌아가기</>
                    </button>
                    <h1 className="register-title">신규 회원 등록</h1>
                    <p className="register-subtitle">새로운 회원 정보를 입력해주세요</p>
                </div>

                {/* 알림 */}
                {error && (
                    <div className="register-alert error">
                        <><AlertCircle size={16} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> {error}</>
                    </div>
                )}
                {success && (
                    <div className="register-alert success">
                        <><CheckCircle size={16} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> 회원이 성공적으로 등록되었습니다!</>
                    </div>
                )}

                {/* 폼 */}
                <form onSubmit={handleSubmit} className="register-form">
                    {/* 이름 */}
                    <div className="register-field">
                        <label className="register-label">
                            <span className="register-label-icon"><User size={16} /></span>
                            이름
                        </label>
                        <input
                            type="text"
                            className="register-input"
                            placeholder="회원 이름을 입력하세요"
                            value={form.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                        />
                    </div>

                    {/* 전화번호 */}
                    <div className="register-field">
                        <label className="register-label">
                            <span className="register-label-icon"><Phone size={16} /></span>
                            전화번호
                        </label>
                        <input
                            type="tel"
                            className="register-input"
                            placeholder="010-0000-0000"
                            value={form.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                        />
                    </div>

                    {/* 나이 */}
                    <div className="register-field">
                        <label className="register-label">
                            <span className="register-label-icon"><Cake size={16} /></span>
                            나이
                        </label>
                        <input
                            type="number"
                            className="register-input"
                            placeholder="나이를 입력하세요"
                            value={form.age}
                            onChange={(e) => handleChange('age', e.target.value)}
                            min="1"
                            max="120"
                        />
                    </div>

                    {/* 성별 */}
                    <div className="register-field">
                        <label className="register-label">
                            <span className="register-label-icon"><UsersIcon size={16} /></span>
                            성별
                        </label>
                        <div className="register-gender-group">
                            <button
                                type="button"
                                className={`register-gender-btn ${form.gender === 'male' ? 'active' : ''}`}
                                onClick={() => handleChange('gender', 'male')}
                            >
                                남성
                            </button>
                            <button
                                type="button"
                                className={`register-gender-btn ${form.gender === 'female' ? 'active' : ''}`}
                                onClick={() => handleChange('gender', 'female')}
                            >
                                여성
                            </button>
                        </div>
                    </div>

                    {/* 등록 버튼 */}
                    <button
                        type="submit"
                        className="register-submit-btn"
                        disabled={loading}
                    >
                        {loading ? '등록 중...' : <><UserPlus size={18} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> 회원 등록</>}
                    </button>
                </form>
            </div>
        </div>
    )
}
