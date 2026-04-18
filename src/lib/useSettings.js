import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// 메모리 캐시 (한 세션 내에서 재사용)
let cachedSettings = null
const subscribers = new Set()

const DEFAULT_SETTINGS = {
    gym_name: '내 체육관',
    gym_slogan: '',
    gym_logo_emoji: '🥊',
    gym_phone: '',
    gym_email: '',
    business_name: '',
    business_representative: '',
    business_address: '',
    business_number: '',
    privacy_officer_name: '',
    privacy_officer_email: '',
    privacy_officer_phone: '',
    operating_hours: {
        mon: { open: '06:00', close: '23:00', closed: false },
        tue: { open: '06:00', close: '23:00', closed: false },
        wed: { open: '06:00', close: '23:00', closed: false },
        thu: { open: '06:00', close: '23:00', closed: false },
        fri: { open: '06:00', close: '23:00', closed: false },
        sat: { open: '08:00', close: '20:00', closed: false },
        sun: { open: '08:00', close: '20:00', closed: true },
    },
    membership_types: [
        { name: '1개월', duration_days: 30, price: 150000 },
        { name: '3개월', duration_days: 90, price: 400000 },
        { name: '6개월', duration_days: 180, price: 700000 },
        { name: '1년', duration_days: 365, price: 1200000 },
    ],
    locker_total_count: 0,
    locker_monthly_fee: 30000,
    notify_membership_expiry_days: 7,
    auto_block_expired: false,
    monitor_slide_duration: 10,
    monitor_show_ranking: true,
    monitor_show_realtime: true,
    monitor_show_intensity: true,
    monitor_show_motivation: true,
    monitor_show_new_members: true,
    theme_primary_color: '#E53E3E',
}

/**
 * 체육관 설정을 가져오는 hook
 * - 처음 호출 시 DB에서 fetch
 * - 이후 메모리 캐시 사용
 * - 다른 곳에서 업데이트 시 자동 동기화
 */
export function useSettings() {
    const [settings, setSettings] = useState(cachedSettings || DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(!cachedSettings)

    useEffect(() => {
        if (cachedSettings) {
            setSettings(cachedSettings)
            setLoading(false)
        } else {
            fetchSettings()
        }

        // 설정 변경 구독
        const handler = (newSettings) => setSettings(newSettings)
        subscribers.add(handler)
        return () => { subscribers.delete(handler) }
    }, [])

    return { settings, loading, refresh: fetchSettings }
}

export async function fetchSettings() {
    try {
        const { data, error } = await supabase
            .from('gym_settings')
            .select('*')
            .limit(1)
            .single()

        if (error) {
            console.error('설정 로딩 에러:', error)
            return DEFAULT_SETTINGS
        }

        const merged = { ...DEFAULT_SETTINGS, ...data }
        cachedSettings = merged
        subscribers.forEach(fn => fn(merged))
        return merged
    } catch (err) {
        console.error('설정 로딩 에러:', err)
        return DEFAULT_SETTINGS
    }
}

export async function updateSettings(updates) {
    try {
        // 현재 row id 가져오기
        const { data: existing } = await supabase
            .from('gym_settings')
            .select('id')
            .limit(1)
            .single()

        if (!existing) {
            // row가 없으면 새로 만들기
            const { data: created, error: createError } = await supabase
                .from('gym_settings')
                .insert(updates)
                .select()
                .single()
            if (createError) throw createError
            cachedSettings = { ...DEFAULT_SETTINGS, ...created }
        } else {
            const { data: updated, error: updateError } = await supabase
                .from('gym_settings')
                .update(updates)
                .eq('id', existing.id)
                .select()
                .single()
            if (updateError) throw updateError
            cachedSettings = { ...DEFAULT_SETTINGS, ...updated }
        }

        subscribers.forEach(fn => fn(cachedSettings))
        return cachedSettings
    } catch (err) {
        console.error('설정 저장 에러:', err)
        throw err
    }
}
