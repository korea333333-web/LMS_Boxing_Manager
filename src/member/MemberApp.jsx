import { useState, useEffect } from 'react'
import MemberLogin from './MemberLogin'
import MemberHome from './MemberHome'
import MemberConsent from './MemberConsent'

export default function MemberApp() {
    const [member, setMember] = useState(null)

    useEffect(() => {
        try {
            const saved = localStorage.getItem('member_session')
            if (saved) setMember(JSON.parse(saved))
        } catch { }
    }, [])

    function handleLogin(memberData) {
        setMember(memberData)
    }

    function handleLogout() {
        localStorage.removeItem('member_session')
        setMember(null)
    }

    function handleConsentComplete(updatedMember) {
        setMember(updatedMember)
    }

    if (!member) {
        return <MemberLogin onLogin={handleLogin} />
    }

    // 동의를 받지 않은 회원은 동의 화면 표시
    if (!member.privacy_agreed_at || !member.terms_agreed_at) {
        return <MemberConsent member={member} onComplete={handleConsentComplete} />
    }

    return <MemberHome member={member} onLogout={handleLogout} />
}
