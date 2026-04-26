import { useState, useEffect } from 'react'

const STORAGE_KEY = 'punchtrack_theme'
const THEMES = ['dark', 'light']
const subscribers = new Set()
let currentTheme = null

function detectInitial() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (THEMES.includes(saved)) return saved
    } catch {}
    // 시스템 선호도 따라가기
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
}

function applyTheme(theme) {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme)
    }
    currentTheme = theme
    subscribers.forEach(fn => fn(theme))
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
}

// 초기 적용 (앱 시작 시 1회)
if (typeof document !== 'undefined' && !currentTheme) {
    applyTheme(detectInitial())
}

export function useTheme() {
    const [theme, setTheme] = useState(currentTheme || 'dark')

    useEffect(() => {
        const handler = (t) => setTheme(t)
        subscribers.add(handler)
        return () => subscribers.delete(handler)
    }, [])

    function changeTheme(next) {
        if (THEMES.includes(next)) applyTheme(next)
    }

    function toggle() {
        applyTheme(theme === 'dark' ? 'light' : 'dark')
    }

    return { theme, setTheme: changeTheme, toggle, themes: THEMES }
}
