import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import bcrypt from 'bcryptjs'
import { ArrowRight, Eye, EyeOff, Sparkles, Shield, Zap } from 'lucide-react'

// 슬라이드쇼 이미지 + 매칭 태그라인 (10장 자동 회전)
// focus: background-position 값 (인물/주체가 잘 보이도록 크롭 위치 조정)
const HERO_SLIDES = [
    {
        src: '/images/ring-spotlight.png',
        label: 'THE RING',
        title: 'Step Into the Ring.',
        subtitle: '오늘도 새로운 도전이 시작됩니다',
        focus: 'center 60%',  // 링이 하단에 위치
    },
    {
        src: '/images/champion-belt.png',
        label: 'CHAMPION',
        title: 'Earn Your Belt.',
        subtitle: '한 명의 챔피언, 한 명의 회원부터',
        focus: 'center 25%',  // 얼굴 + 벨트 살리기 (가로 → 세로 변환)
    },
    {
        src: '/images/triumph-fist.png',
        label: 'TRIUMPH',
        title: 'Every Win Counts.',
        subtitle: '모든 운동이 데이터가 되는 곳',
        focus: 'center 20%',  // 주먹 + 얼굴 (가로)
    },
    {
        src: '/images/boxer-face.png',
        label: 'THE FIGHTER',
        title: 'Train Smarter.',
        subtitle: '데이터로 만드는 챔피언',
        focus: 'center 30%',  // 얼굴이 상단에 위치
    },
    {
        src: '/images/entrance-walk.png',
        label: 'THE WALK',
        title: 'The Walk Begins.',
        subtitle: '전설의 시작은 한 걸음부터',
        focus: 'center 40%',  // 후드 입은 인물 전신 (가로)
    },
    {
        src: '/images/hooded-warrior.png',
        label: 'WARRIOR',
        title: 'Born to Fight.',
        subtitle: '복싱장의 모든 순간을 기록하세요',
        focus: 'center 35%',  // 후드 인물 (가로)
    },
    {
        src: '/images/victory-stadium.png',
        label: 'VICTORY',
        title: 'Above the Crowd.',
        subtitle: '회원이 빛나면 체육관이 빛납니다',
        focus: 'center 20%',  // 주먹 들어올린 자세 (가로 → 위쪽 살림)
    },
    {
        src: '/images/ring-underground.png',
        label: 'UNDERGROUND',
        title: 'Built for Real Gyms.',
        subtitle: '겉만 화려한 시스템은 No.',
        focus: 'center 50%',  // 링 중앙
    },
    {
        src: '/images/gloves-1.png',
        label: 'CRAFT',
        title: 'Premium. Powerful.',
        subtitle: '디테일 하나하나 신경 쓴 도구',
        focus: '70% center',  // 글러브가 우측에 위치
    },
    {
        src: '/images/gloves-2.png',
        label: 'LEGACY',
        title: 'Your Gym, Reimagined.',
        subtitle: '회원관리의 새로운 기준',
        focus: 'center 45%',  // 글러브 중앙
    },
]

export default function AdminLogin() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [slideIdx, setSlideIdx] = useState(0)
    const [imgLoaded, setImgLoaded] = useState({})

    // 자동 슬라이드쇼 (7초마다 - 이미지 많아져서 살짝 늘림)
    useEffect(() => {
        const t = setInterval(() => {
            setSlideIdx(s => (s + 1) % HERO_SLIDES.length)
        }, 7000)
        return () => clearInterval(t)
    }, [])

    // 이미지 프리로드
    useEffect(() => {
        HERO_SLIDES.forEach((s, i) => {
            const image = new Image()
            image.onload = () => setImgLoaded(p => ({ ...p, [i]: true }))
            image.src = s.src
        })
    }, [])

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { data, error: dbError } = await supabase
                .from('admin_users').select('*').eq('username', username).single()

            if (dbError || !data) {
                setError('아이디 또는 비밀번호가 올바르지 않습니다')
                setLoading(false); return
            }

            const isValid = await bcrypt.compare(password, data.password_hash)
            if (!isValid) {
                setError('아이디 또는 비밀번호가 올바르지 않습니다')
                setLoading(false); return
            }

            const session = {
                id: data.id, username: data.username, name: data.name,
                role: data.role, loginAt: new Date().toISOString(),
            }
            localStorage.setItem('admin_session', JSON.stringify(session))
            navigate('/admin/dashboard', { replace: true })
        } catch (err) {
            console.error('Login error:', err)
            setError('로그인 중 오류가 발생했습니다')
        } finally {
            setLoading(false)
        }
    }

    const current = HERO_SLIDES[slideIdx]
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

    return (
        <div className="login-stage">
            {/* === 좌측: 시네마틱 비주얼 === */}
            <div className="login-hero">
                {/* 슬라이드쇼 (페이드 전환 + 정확한 크롭 위치) */}
                {HERO_SLIDES.map((s, i) => (
                    <div
                        key={i}
                        className={`login-hero-image ${slideIdx === i ? 'active' : ''}`}
                        style={{
                            backgroundImage: `url('${s.src}')`,
                            backgroundPosition: s.focus || 'center',
                        }}
                    />
                ))}
                {/* 그라데이션 오버레이 */}
                <div className="login-hero-overlay" />
                <div className="login-hero-vignette" />

                {/* 좌측 상단 - 브랜드 */}
                <div className="login-hero-top">
                    <div className="login-brand">
                        <div className="login-brand-mark">
                            <span className="login-brand-glow" />
                            🥊
                        </div>
                        <div>
                            <div className="login-brand-name">PunchTrack</div>
                            <div className="login-brand-tag">ADMIN OS</div>
                        </div>
                    </div>
                    <div className="login-time">
                        <div className="login-time-dot" />
                        {time} · LIVE
                    </div>
                </div>

                {/* 좌측 중앙 - 큰 타이포 */}
                <div className="login-hero-center">
                    <div key={slideIdx} className="login-hero-tagline">
                        <h1 className="login-hero-title">{current.title}</h1>
                        <p className="login-hero-sub">{current.subtitle}</p>
                    </div>
                </div>

                {/* 좌측 하단 - 슬라이드 정보 + 인디케이터 */}
                <div className="login-hero-bottom">
                    <div className="login-slide-meta">
                        <span className="login-slide-num">
                            {String(slideIdx + 1).padStart(2, '0')} <span className="login-slide-divider">/</span> {String(HERO_SLIDES.length).padStart(2, '0')}
                        </span>
                        <span className="login-slide-label">{current.label}</span>
                    </div>

                    <div className="login-slide-progress">
                        {HERO_SLIDES.map((_, i) => (
                            <button
                                key={i}
                                className={`login-progress-bar ${slideIdx === i ? 'active' : ''} ${i < slideIdx ? 'past' : ''}`}
                                onClick={() => setSlideIdx(i)}
                                aria-label={`슬라이드 ${i + 1}`}
                            />
                        ))}
                    </div>

                    {/* 신뢰 배지 */}
                    <div className="login-trust">
                        <div className="login-trust-item">
                            <Shield size={14} />
                            <span>SOC 2 보안</span>
                        </div>
                        <div className="login-trust-item">
                            <Zap size={14} />
                            <span>실시간 동기화</span>
                        </div>
                        <div className="login-trust-item">
                            <Sparkles size={14} />
                            <span>AI 분석</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === 우측: 미니멀 폼 === */}
            <div className="login-form-side">
                <div className="login-form-wrap">
                    {/* 헤더 */}
                    <div className="login-form-header">
                        <div className="login-form-eyebrow">
                            <span className="login-form-eyebrow-dot" />
                            관리자 로그인
                        </div>
                        <h2 className="login-form-title">
                            오늘도 <span className="login-form-title-accent">챔피언</span>을<br />만들 시간입니다
                        </h2>
                        <p className="login-form-subtitle">
                            계정 정보를 입력하고 시작하세요
                        </p>
                    </div>

                    {/* 폼 */}
                    <form onSubmit={handleLogin} className="login-form-modern">
                        {error && (
                            <div className="login-error-modern">
                                <span className="login-error-dot" />
                                {error}
                            </div>
                        )}

                        <div className="login-field-modern">
                            <label className="login-label-modern">아이디</label>
                            <div className="login-input-wrap">
                                <input
                                    type="text"
                                    className="login-input-modern"
                                    placeholder="admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="login-field-modern">
                            <label className="login-label-modern">
                                <span>비밀번호</span>
                                <button type="button" className="login-label-link">잊으셨나요?</button>
                            </label>
                            <div className="login-input-wrap">
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    className="login-input-modern"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="login-input-action"
                                    onClick={() => setShowPwd(!showPwd)}
                                >
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <label className="login-remember-modern">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span className="login-checkbox-modern">
                                {rememberMe && <span className="login-check">✓</span>}
                            </span>
                            <span>이 기기에서 로그인 유지</span>
                        </label>

                        <button type="submit" className="login-cta-modern" disabled={loading}>
                            <span className="login-cta-text">
                                {loading ? '확인 중...' : '관리자 페이지 진입'}
                            </span>
                            <span className="login-cta-arrow">
                                <ArrowRight size={18} />
                            </span>
                            <span className="login-cta-glow" />
                        </button>
                    </form>

                    {/* 푸터 */}
                    <div className="login-form-footer">
                        <div className="login-form-divider">
                            <span>OR</span>
                        </div>
                        <p className="login-help">
                            계정이 없으신가요?{' '}
                            <a href="#" className="login-help-link">관장님 가입 문의</a>
                        </p>
                        <div className="login-copyright">
                            © 2026 PunchTrack · v3.2 Modern
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
