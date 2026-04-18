import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, User, Phone, Cake, Users as UsersIcon, UserPlus, AlertCircle, CheckCircle, Shield, Printer, Camera, FileImage, Tv } from 'lucide-react'
import { checkNickname, maskName } from '../../utils/displayName'

export default function MemberRegister() {
    const navigate = useNavigate()
    const [form, setForm] = useState({
        name: '',
        phone: '',
        age: '',
        gender: '',
        nickname: '',
        display_mode: 'masked', // 'nickname' | 'masked' | 'hidden'
    })
    const [consents, setConsents] = useState({
        privacy: false,
        terms: false,
        marketing: false,
        guardian: false,
    })
    const [guardianInfo, setGuardianInfo] = useState({ name: '', phone: '' })
    const [consentImage, setConsentImage] = useState(null) // File 객체
    const [consentImagePreview, setConsentImagePreview] = useState(null) // Data URL
    const [uploadingImage, setUploadingImage] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const isUnder14 = form.age && Number(form.age) < 14

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
        setError('')
        setSuccess(false)
    }

    const toggleConsent = (key) => {
        setConsents(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const toggleAllRequired = () => {
        const allChecked = consents.privacy && consents.terms && (!isUnder14 || consents.guardian)
        const newValue = !allChecked
        setConsents(prev => ({
            ...prev,
            privacy: newValue,
            terms: newValue,
            guardian: isUnder14 ? newValue : prev.guardian,
        }))
    }

    // 동의서 출력 (새 창)
    const printConsentForm = () => {
        if (!form.name.trim() || !form.phone.trim()) {
            setError('동의서 출력 전에 이름과 전화번호를 입력해주세요')
            return
        }
        const params = new URLSearchParams({
            name: form.name.trim(),
            phone: form.phone.trim(),
            age: form.age || '',
        })
        window.open(`/consent-form?${params.toString()}`, '_blank', 'width=900,height=1200')
    }

    // 동의서 사진 선택
    const handleImageSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setError('이미지 파일만 첨부 가능합니다'); return
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('파일 크기는 10MB 이하여야 합니다'); return
        }
        setConsentImage(file)
        // 미리보기
        const reader = new FileReader()
        reader.onloadend = () => setConsentImagePreview(reader.result)
        reader.readAsDataURL(file)
        setError('')
    }

    const removeImage = () => {
        setConsentImage(null)
        setConsentImagePreview(null)
    }

    // Supabase Storage에 사진 업로드
    const uploadConsentImage = async (memberId) => {
        if (!consentImage) return null
        const ext = consentImage.name.split('.').pop()
        const fileName = `${memberId}_${Date.now()}.${ext}`
        const filePath = `consents/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('consents')
            .upload(filePath, consentImage, { cacheControl: '3600', upsert: false })

        if (uploadError) {
            console.error('이미지 업로드 에러:', uploadError)
            throw new Error('동의서 사진 업로드 실패: ' + uploadError.message)
        }

        const { data: urlData } = supabase.storage.from('consents').getPublicUrl(filePath)
        return urlData?.publicUrl || filePath
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess(false)

        if (!form.name.trim()) { setError('이름을 입력해주세요'); return }
        if (!form.phone.trim()) { setError('전화번호를 입력해주세요'); return }
        if (!form.age || isNaN(form.age) || Number(form.age) < 1 || Number(form.age) > 120) {
            setError('올바른 나이를 입력해주세요 (1~120)'); return
        }
        if (!form.gender) { setError('성별을 선택해주세요'); return }

        // 닉네임 모드 선택 시 닉네임 검사
        if (form.display_mode === 'nickname') {
            const result = checkNickname(form.nickname)
            if (!result.ok) { setError(`닉네임 오류: ${result.reason}`); return }
        }

        // 동의 확인
        if (!consents.privacy) { setError('개인정보 수집·이용에 동의해주세요 (필수)'); return }
        if (!consents.terms) { setError('이용약관에 동의해주세요 (필수)'); return }

        if (isUnder14) {
            if (!consents.guardian) { setError('14세 미만은 법정대리인 동의가 필요합니다'); return }
            if (!guardianInfo.name.trim()) { setError('법정대리인(부모) 이름을 입력해주세요'); return }
            if (!guardianInfo.phone.trim()) { setError('법정대리인(부모) 전화번호를 입력해주세요'); return }
        }

        setLoading(true)
        try {
            const { data: existing } = await supabase
                .from('members').select('id').eq('phone', form.phone.trim()).single()
            if (existing) { setError('이미 등록된 전화번호입니다'); setLoading(false); return }

            const now = new Date().toISOString()
            const { data: newMember, error: insertError } = await supabase
                .from('members').insert({
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    age: Number(form.age),
                    gender: form.gender,
                    nickname: form.nickname.trim() || null,
                    display_mode: form.display_mode,
                    privacy_agreed_at: now,
                    terms_agreed_at: now,
                    marketing_agreed_at: consents.marketing ? now : null,
                    guardian_name: isUnder14 ? guardianInfo.name.trim() : null,
                    guardian_phone: isUnder14 ? guardianInfo.phone.trim() : null,
                    guardian_agreed_at: isUnder14 ? now : null,
                }).select().single()

            if (insertError) {
                console.error('Insert error:', insertError)
                setError('회원 등록 중 오류가 발생했습니다')
                setLoading(false); return
            }

            // 동의서 사진 업로드 (있으면)
            if (consentImage && newMember) {
                setUploadingImage(true)
                try {
                    const imageUrl = await uploadConsentImage(newMember.id)
                    if (imageUrl) {
                        await supabase.from('members')
                            .update({
                                consent_image_url: imageUrl,
                                consent_image_uploaded_at: now,
                            })
                            .eq('id', newMember.id)
                    }
                } catch (uploadErr) {
                    console.error(uploadErr)
                    // 회원 등록은 성공, 사진만 실패
                    alert('회원 등록은 완료되었으나 동의서 사진 업로드에 실패했습니다.\n회원 상세에서 다시 첨부해주세요.')
                } finally {
                    setUploadingImage(false)
                }
            }

            // 동의 이력 기록
            if (newMember) {
                const logs = [
                    { member_id: newMember.id, consent_type: 'privacy', agreed: true },
                    { member_id: newMember.id, consent_type: 'terms', agreed: true },
                    { member_id: newMember.id, consent_type: 'marketing', agreed: consents.marketing },
                ]
                if (isUnder14) {
                    logs.push({ member_id: newMember.id, consent_type: 'guardian', agreed: true,
                                notes: `${guardianInfo.name} (${guardianInfo.phone})` })
                }
                await supabase.from('member_consent_logs').insert(logs)
            }

            setSuccess(true)
            setForm({ name: '', phone: '', age: '', gender: '', nickname: '', display_mode: 'masked' })
            setConsents({ privacy: false, terms: false, marketing: false, guardian: false })
            setGuardianInfo({ name: '', phone: '' })
            setConsentImage(null)
            setConsentImagePreview(null)
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
                <div className="register-header">
                    <button className="register-back-btn" onClick={() => navigate('/admin/members')}>
                        <ArrowLeft size={16} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> 돌아가기
                    </button>
                    <h1 className="register-title">신규 회원 등록</h1>
                    <p className="register-subtitle">새로운 회원 정보를 입력해주세요</p>
                </div>

                {error && (
                    <div className="register-alert error">
                        <AlertCircle size={16} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> {error}
                    </div>
                )}
                {success && (
                    <div className="register-alert success">
                        <CheckCircle size={16} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> 회원이 성공적으로 등록되었습니다!
                    </div>
                )}

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="register-field">
                        <label className="register-label">
                            <span className="register-label-icon"><User size={16} /></span> 이름
                        </label>
                        <input type="text" className="register-input" placeholder="회원 이름을 입력하세요"
                            value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
                    </div>

                    {/* 모니터/랭킹 표시 방식 */}
                    <div className="register-display-box">
                        <div className="register-display-header">
                            <Tv size={16} /> 체육관 모니터/랭킹 표시 방식
                        </div>
                        <p className="register-display-desc">
                            체육관 TV에 칼로리 랭킹이 표시됩니다. 회원이 어떻게 표시될지 선택하세요.
                        </p>
                        <div className="register-display-options">
                            <label className={`register-display-opt ${form.display_mode === 'nickname' ? 'active' : ''}`}>
                                <input type="radio" name="display_mode" value="nickname"
                                    checked={form.display_mode === 'nickname'}
                                    onChange={() => handleChange('display_mode', 'nickname')} />
                                <div>
                                    <div className="opt-title">닉네임으로 표시</div>
                                    <div className="opt-example">예: "펀치맨"</div>
                                </div>
                            </label>
                            <label className={`register-display-opt ${form.display_mode === 'masked' ? 'active' : ''}`}>
                                <input type="radio" name="display_mode" value="masked"
                                    checked={form.display_mode === 'masked'}
                                    onChange={() => handleChange('display_mode', 'masked')} />
                                <div>
                                    <div className="opt-title">마스킹 이름 (권장)</div>
                                    <div className="opt-example">예: "{maskName(form.name) || '김*수'}"</div>
                                </div>
                            </label>
                            <label className={`register-display-opt ${form.display_mode === 'hidden' ? 'active' : ''}`}>
                                <input type="radio" name="display_mode" value="hidden"
                                    checked={form.display_mode === 'hidden'}
                                    onChange={() => handleChange('display_mode', 'hidden')} />
                                <div>
                                    <div className="opt-title">표시 안 함</div>
                                    <div className="opt-example">랭킹에서 제외</div>
                                </div>
                            </label>
                        </div>

                        {form.display_mode === 'nickname' && (
                            <div className="register-field" style={{ marginTop: 12 }}>
                                <input type="text" className="register-input"
                                    placeholder="닉네임 (1~12자, 한글/영문/숫자)"
                                    value={form.nickname}
                                    onChange={(e) => handleChange('nickname', e.target.value)}
                                    maxLength={12} />
                            </div>
                        )}
                    </div>

                    <div className="register-field">
                        <label className="register-label">
                            <span className="register-label-icon"><Phone size={16} /></span> 전화번호
                        </label>
                        <input type="tel" className="register-input" placeholder="010-0000-0000"
                            value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                    </div>

                    <div className="register-field">
                        <label className="register-label">
                            <span className="register-label-icon"><Cake size={16} /></span> 나이
                        </label>
                        <input type="number" className="register-input" placeholder="나이를 입력하세요"
                            value={form.age} onChange={(e) => handleChange('age', e.target.value)} min="1" max="120" />
                    </div>

                    <div className="register-field">
                        <label className="register-label">
                            <span className="register-label-icon"><UsersIcon size={16} /></span> 성별
                        </label>
                        <div className="register-gender-group">
                            <button type="button"
                                className={`register-gender-btn ${form.gender === 'male' ? 'active' : ''}`}
                                onClick={() => handleChange('gender', 'male')}>남성</button>
                            <button type="button"
                                className={`register-gender-btn ${form.gender === 'female' ? 'active' : ''}`}
                                onClick={() => handleChange('gender', 'female')}>여성</button>
                        </div>
                    </div>

                    {/* 14세 미만 보호자 정보 */}
                    {isUnder14 && (
                        <div className="register-guardian-box">
                            <div className="register-guardian-title">
                                <Shield size={16} /> 14세 미만 — 법정대리인 정보 (필수)
                            </div>
                            <div className="register-field">
                                <label className="register-label">보호자 이름</label>
                                <input type="text" className="register-input" placeholder="부모님 성함"
                                    value={guardianInfo.name}
                                    onChange={(e) => setGuardianInfo(p => ({...p, name: e.target.value}))} />
                            </div>
                            <div className="register-field">
                                <label className="register-label">보호자 전화번호</label>
                                <input type="tel" className="register-input" placeholder="010-0000-0000"
                                    value={guardianInfo.phone}
                                    onChange={(e) => setGuardianInfo(p => ({...p, phone: e.target.value}))} />
                            </div>
                        </div>
                    )}

                    {/* 동의서 종이 출력 + 사진 첨부 섹션 */}
                    <div className="register-paper-box">
                        <div className="register-paper-title">
                            📄 동의서 (종이 + 사진 보관)
                        </div>
                        <p className="register-paper-desc">
                            ① <strong>동의서 출력</strong> → ② 회원이 종이에 서명 → ③ <strong>사진 촬영해 첨부</strong>
                        </p>

                        <div className="register-paper-actions">
                            <button type="button" className="register-paper-btn print"
                                onClick={printConsentForm}>
                                <Printer size={18} /> 동의서 출력하기
                            </button>

                            <label className="register-paper-btn upload">
                                <Camera size={18} />
                                {consentImage ? '동의서 사진 변경' : '동의서 사진 촬영/첨부'}
                                <input type="file" accept="image/*" capture="environment"
                                    onChange={handleImageSelect}
                                    style={{ display: 'none' }} />
                            </label>
                        </div>

                        {consentImagePreview && (
                            <div className="register-image-preview">
                                <img src={consentImagePreview} alt="동의서 미리보기" />
                                <div className="register-image-info">
                                    <FileImage size={14} /> {consentImage.name} ({(consentImage.size / 1024).toFixed(0)}KB)
                                    <button type="button" onClick={removeImage} className="register-image-remove">제거</button>
                                </div>
                            </div>
                        )}

                        {!consentImage && (
                            <p className="register-paper-warning">
                                ⚠️ 동의서 사진은 분쟁 시 가장 강력한 증거입니다. 가능하면 첨부해주세요.
                            </p>
                        )}
                    </div>

                    {/* 동의 섹션 */}
                    <div className="register-consent-box">
                        <div className="register-consent-header">
                            <Shield size={16} /> 시스템 동의 기록
                        </div>
                        <p className="register-consent-notice">
                            종이 동의서와 별개로 시스템에도 동의 기록을 남깁니다.
                        </p>

                        <label className="register-consent-row all">
                            <input type="checkbox"
                                checked={consents.privacy && consents.terms && (!isUnder14 || consents.guardian)}
                                onChange={toggleAllRequired} />
                            <span><strong>필수 항목 전체 동의</strong></span>
                        </label>

                        <label className="register-consent-row">
                            <input type="checkbox" checked={consents.privacy}
                                onChange={() => toggleConsent('privacy')} />
                            <span>
                                <span className="required">[필수]</span> 개인정보 수집·이용 동의
                                <Link to="/privacy" target="_blank" className="register-consent-link">전문 보기</Link>
                            </span>
                        </label>

                        <label className="register-consent-row">
                            <input type="checkbox" checked={consents.terms}
                                onChange={() => toggleConsent('terms')} />
                            <span>
                                <span className="required">[필수]</span> 이용약관 동의
                                <Link to="/terms" target="_blank" className="register-consent-link">전문 보기</Link>
                            </span>
                        </label>

                        {isUnder14 && (
                            <label className="register-consent-row">
                                <input type="checkbox" checked={consents.guardian}
                                    onChange={() => toggleConsent('guardian')} />
                                <span>
                                    <span className="required">[필수]</span> 법정대리인(부모) 동의 확인
                                </span>
                            </label>
                        )}

                        <label className="register-consent-row">
                            <input type="checkbox" checked={consents.marketing}
                                onChange={() => toggleConsent('marketing')} />
                            <span>
                                <span className="optional">[선택]</span> 마케팅·이벤트 알림 수신 동의
                            </span>
                        </label>
                    </div>

                    <button type="submit" className="register-submit-btn" disabled={loading}>
                        {loading ? '등록 중...' : <><UserPlus size={18} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> 회원 등록</>}
                    </button>
                </form>
            </div>
        </div>
    )
}
