-- ============================================
-- 회원 동의 기록 - 데이터베이스 설정
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- members 테이블에 동의 관련 컬럼 추가
ALTER TABLE members ADD COLUMN IF NOT EXISTS privacy_agreed_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS terms_agreed_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS marketing_agreed_at TIMESTAMPTZ;

-- 14세 미만 회원의 법정대리인 동의 기록
ALTER TABLE members ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS guardian_agreed_at TIMESTAMPTZ;

-- 닉네임 (모니터 디스플레이용)
ALTER TABLE members ADD COLUMN IF NOT EXISTS nickname TEXT;

-- 동의서 사진 URL (Supabase Storage)
ALTER TABLE members ADD COLUMN IF NOT EXISTS consent_image_url TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS consent_image_uploaded_at TIMESTAMPTZ;

-- ============================================
-- Supabase Storage 버킷 생성 안내 (UI에서 수동 설정)
-- 1. Supabase 대시보드 → Storage → New Bucket
-- 2. 이름: consents
-- 3. Public: false (비공개)
-- 4. 정책: 인증된 사용자만 업로드/조회 가능
-- ============================================

-- 동의 이력 테이블 (이력 추적용)
CREATE TABLE IF NOT EXISTS member_consent_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('privacy', 'terms', 'marketing', 'guardian')),
    agreed BOOLEAN NOT NULL,
    agreed_at TIMESTAMPTZ DEFAULT now(),
    user_agent TEXT,
    notes TEXT
);

ALTER TABLE member_consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_logs_select" ON member_consent_logs FOR SELECT USING (true);
CREATE POLICY "consent_logs_insert" ON member_consent_logs FOR INSERT WITH CHECK (true);
