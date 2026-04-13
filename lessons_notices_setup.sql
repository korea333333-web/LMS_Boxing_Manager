-- ============================================
-- 수업일지 & 공지/메시지 - 데이터베이스 설정
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. lessons 테이블 (수업일지)
-- ============================================
CREATE TABLE IF NOT EXISTS lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    lesson_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_group TEXT NOT NULL DEFAULT 'all'
        CHECK (target_group IN ('all', 'elementary', 'middle', 'high', 'adult')),
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons_select" ON lessons FOR SELECT USING (true);
CREATE POLICY "lessons_insert" ON lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "lessons_update" ON lessons FOR UPDATE USING (true);
CREATE POLICY "lessons_delete" ON lessons FOR DELETE USING (true);

-- ============================================
-- 2. notices 테이블 (공지/메시지)
-- ============================================
CREATE TABLE IF NOT EXISTS notices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('normal', 'important', 'urgent')),
    target_age TEXT[] DEFAULT '{}',
    target_gender TEXT[] DEFAULT '{}',
    target_status TEXT[] DEFAULT '{}',
    target_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notices_select" ON notices FOR SELECT USING (true);
CREATE POLICY "notices_insert" ON notices FOR INSERT WITH CHECK (true);
CREATE POLICY "notices_update" ON notices FOR UPDATE USING (true);
CREATE POLICY "notices_delete" ON notices FOR DELETE USING (true);

-- ============================================
-- 3. notice_reads 테이블 (공지 읽음 추적)
-- ============================================
CREATE TABLE IF NOT EXISTS notice_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(notice_id, member_id)
);

ALTER TABLE notice_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notice_reads_select" ON notice_reads FOR SELECT USING (true);
CREATE POLICY "notice_reads_insert" ON notice_reads FOR INSERT WITH CHECK (true);
