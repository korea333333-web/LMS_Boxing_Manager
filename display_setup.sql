-- ============================================
-- 모니터 디스플레이 - 데이터베이스 설정
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 랭킹/모니터 표시 방식
-- 'nickname': 닉네임 사용 (없으면 마스킹 이름)
-- 'masked': 마스킹된 이름 (예: 김*수)
-- 'hidden': 표시 안 함 (랭킹에서 제외)
ALTER TABLE members ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'masked'
    CHECK (display_mode IN ('nickname', 'masked', 'hidden'));

-- 닉네임 부적절 신고/차단용 (관장님이 강제 차단 시)
ALTER TABLE members ADD COLUMN IF NOT EXISTS nickname_blocked BOOLEAN DEFAULT FALSE;
