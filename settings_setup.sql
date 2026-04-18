-- ============================================
-- 체육관 설정 - 데이터베이스 설정
-- Supabase SQL Editor에서 실행하세요
-- ============================================
--
-- 단일 row 테이블 (체육관 1개당 1 row)
-- 이 row의 정보가 사이트 전체(정책페이지/모니터/동의서/대시보드)에 자동 반영됨
-- ============================================

CREATE TABLE IF NOT EXISTS gym_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- 🏢 기본 정보
    gym_name TEXT NOT NULL DEFAULT '내 체육관',
    gym_slogan TEXT,
    gym_logo_emoji TEXT DEFAULT '🥊',
    gym_phone TEXT,
    gym_email TEXT,

    -- 📋 사업자 정보 (정책 페이지/동의서에 표시)
    business_name TEXT,
    business_representative TEXT,
    business_address TEXT,
    business_number TEXT,
    business_registration_date DATE,

    -- 👤 개인정보보호책임자
    privacy_officer_name TEXT,
    privacy_officer_email TEXT,
    privacy_officer_phone TEXT,

    -- ⏰ 운영 시간 (요일별 오픈/마감 시각, JSON)
    -- 예: {"mon": {"open": "06:00", "close": "23:00", "closed": false}, ...}
    operating_hours JSONB DEFAULT '{
        "mon": {"open": "06:00", "close": "23:00", "closed": false},
        "tue": {"open": "06:00", "close": "23:00", "closed": false},
        "wed": {"open": "06:00", "close": "23:00", "closed": false},
        "thu": {"open": "06:00", "close": "23:00", "closed": false},
        "fri": {"open": "06:00", "close": "23:00", "closed": false},
        "sat": {"open": "08:00", "close": "20:00", "closed": false},
        "sun": {"open": "08:00", "close": "20:00", "closed": true}
    }'::jsonb,

    -- 💳 회원권 종류 + 가격 (JSON 배열)
    -- 예: [{"name": "1개월", "duration_days": 30, "price": 150000}, ...]
    membership_types JSONB DEFAULT '[
        {"name": "1개월", "duration_days": 30, "price": 150000},
        {"name": "3개월", "duration_days": 90, "price": 400000},
        {"name": "6개월", "duration_days": 180, "price": 700000},
        {"name": "1년", "duration_days": 365, "price": 1200000}
    ]'::jsonb,

    -- 🔒 락커
    locker_total_count INTEGER DEFAULT 0,
    locker_monthly_fee INTEGER DEFAULT 30000,

    -- 🔔 알림 설정
    notify_membership_expiry_days INTEGER DEFAULT 7,  -- 만료 며칠 전부터 알림
    auto_block_expired BOOLEAN DEFAULT FALSE,         -- 만료 회원 자동 출입 차단

    -- 📺 모니터 화면 설정
    monitor_slide_duration INTEGER DEFAULT 10,        -- 슬라이드 전환 초
    monitor_show_ranking BOOLEAN DEFAULT TRUE,
    monitor_show_realtime BOOLEAN DEFAULT TRUE,
    monitor_show_intensity BOOLEAN DEFAULT TRUE,
    monitor_show_motivation BOOLEAN DEFAULT TRUE,
    monitor_show_new_members BOOLEAN DEFAULT TRUE,

    -- 🎨 테마 (선택)
    theme_primary_color TEXT DEFAULT '#E53E3E',

    -- 메타
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gym_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON gym_settings FOR SELECT USING (true);
CREATE POLICY "settings_insert" ON gym_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "settings_update" ON gym_settings FOR UPDATE USING (true);

-- 초기 row 1개 삽입 (이미 있으면 무시)
INSERT INTO gym_settings (gym_name, gym_logo_emoji)
SELECT '내 체육관', '🥊'
WHERE NOT EXISTS (SELECT 1 FROM gym_settings);

-- 자동 updated_at 갱신 트리거
CREATE OR REPLACE FUNCTION update_gym_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gym_settings_updated_at ON gym_settings;
CREATE TRIGGER gym_settings_updated_at
    BEFORE UPDATE ON gym_settings
    FOR EACH ROW EXECUTE FUNCTION update_gym_settings_timestamp();
