import { useState, useEffect } from 'react'
import MemberLogin from './MemberLogin'
import MemberHome from './MemberHome'

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

    if (!member) {
        return <MemberLogin onLogin={handleLogin} />
    }

    return <MemberHome member={member} onLogout={handleLogout} />
}
