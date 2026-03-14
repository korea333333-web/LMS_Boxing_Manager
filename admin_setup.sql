-- ============================================
-- PunchTrack Admin - 데이터베이스 설정
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 0. members 테이블 컬럼 추가 (age, gender)
-- 기존 members 테이블에 나이와 성별 컬럼 추가
-- ============================================
ALTER TABLE members ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
ALTER TABLE members ADD COLUMN IF NOT EXISTS locker_number TEXT;

-- ============================================
-- 1. admin_users 테이블 (관리자 계정)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'coach')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 설정 (MVP: 누구나 접근 가능)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_select" ON admin_users
    FOR SELECT USING (true);

CREATE POLICY "admin_users_insert" ON admin_users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_users_update" ON admin_users
    FOR UPDATE USING (true);

-- ============================================
-- 2. memberships 테이블 (회원권)
-- ============================================
CREATE TABLE IF NOT EXISTS memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('1개월', '3개월', '6개월', '1년')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memberships_select" ON memberships
    FOR SELECT USING (true);

CREATE POLICY "memberships_insert" ON memberships
    FOR INSERT WITH CHECK (true);

CREATE POLICY "memberships_update" ON memberships
    FOR UPDATE USING (true);

-- ============================================
-- 3. payments 테이블 (결제)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('card', 'cash', 'transfer')),
    item TEXT NOT NULL CHECK (item IN ('회원권', 'PT', '기타')),
    memo TEXT,
    paid_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON payments
    FOR SELECT USING (true);

CREATE POLICY "payments_insert" ON payments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "payments_update" ON payments
    FOR UPDATE USING (true);

-- ============================================
-- 4. coach_notes 테이블 (코치 메모)
-- ============================================
CREATE TABLE IF NOT EXISTS coach_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_notes_select" ON coach_notes
    FOR SELECT USING (true);

CREATE POLICY "coach_notes_insert" ON coach_notes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "coach_notes_update" ON coach_notes
    FOR UPDATE USING (true);

-- ============================================
-- 5. 초기 관리자 계정 (admin / admin1234)
-- bcrypt hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- 위 해시는 'admin1234'를 bcrypt로 해싱한 값입니다.
-- ============================================
INSERT INTO admin_users (username, password_hash, name, role)
VALUES (
    'admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '관리자',
    'owner'
) ON CONFLICT (username) DO NOTHING;
