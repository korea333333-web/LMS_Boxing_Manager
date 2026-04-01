import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import bcrypt from 'bcryptjs'
import { Dumbbell, LogIn } from 'lucide-react'

export default function AdminLogin() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // admin_users 테이블에서 아이디 조회
            const { data, error: dbError } = await supabase
                .from('admin_users')
                .select('*')
                .eq('username', username)
                .single()

            if (dbError || !data) {
                setError('아이디 또는 비밀번호가 올바르지 않습니다')
                setLoading(false)
                return
            }

            // bcrypt로 비밀번호 비교
            const isValid = await bcrypt.compare(password, data.password_hash)

            if (!isValid) {
                setError('아이디 또는 비밀번호가 올바르지 않습니다')
                setLoading(false)
                return
            }

            // 세션 저장
            const session = {
                id: data.id,
                username: data.username,
                name: data.name,
                role: data.role,
                loginAt: new Date().toISOString()
            }

            localStorage.setItem('admin_session', JSON.stringify(session))

            // 대시보드로 이동
            navigate('/admin/dashboard', { replace: true })
        } catch (err) {
            console.error('Login error:', err)
            setError('로그인 중 오류가 발생했습니다')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="admin-login-page">
            {/* 비네트 배경 효과 */}
            <div className="admin-login-vignette" />

            <div className="admin-login-card">
                {/* 아이콘 */}
                <div className="admin-login-icon">
                    <Dumbbell size={48} />
                </div>

                {/* 제목 */}
                <h1 className="admin-login-title">PunchTrack</h1>
                <p className="admin-login-subtitle">관리자</p>

                {/* 폼 */}
                <form onSubmit={handleLogin} className="admin-login-form">
                    {/* 에러 메시지 */}
                    {error && (
                        <div className="admin-login-error">
                            {error}
                        </div>
                    )}

                    {/* 아이디 */}
                    <div className="admin-login-field">
                        <label className="admin-login-label">아이디</label>
                        <input
                            type="text"
                            className="admin-login-input"
                            placeholder="아이디를 입력하세요"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>

                    {/* 비밀번호 */}
                    <div className="admin-login-field">
                        <label className="admin-login-label">비밀번호</label>
                        <input
                            type="password"
                            className="admin-login-input"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {/* 로그인 상태 유지 */}
                    <label className="admin-login-remember">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="admin-login-checkbox"
                        />
                        <span className="admin-login-checkbox-custom" />
                        <span>로그인 상태 유지</span>
                    </label>

                    {/* 로그인 버튼 */}
                    <button
                        type="submit"
                        className="admin-login-btn"
                        disabled={loading}
                    >
                        {loading ? '로그인 중...' : <><LogIn size={18} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> 로그인</>}
                    </button>
                </form>

                {/* 하단 링크 */}
                <div className="admin-login-links">
                    <span>비밀번호 찾기</span>
                    <span className="admin-login-divider">|</span>
                    <span>계정 생성 요청</span>
                </div>
            </div>

            {/* 하단 저작권 */}
            <p className="admin-login-copyright">© 2026 PunchTrack</p>
        </div>
    )
}
