-- ============================================
-- 🥊 PunchTrack 메가 목업 - 6개월치 풍성 데이터
-- 회원 50명 (가입 시점 분산: 6개월 전 ~ 이번 달)
-- + 6개월치 출석/운동 + 탈퇴 패턴 + 결제 + 수업일지 + 공지
-- ============================================

-- 정리 (선택)
-- DELETE FROM members WHERE phone LIKE '010-300%' OR phone LIKE '010-MOCK-%' OR phone LIKE '010-2001-%';

-- ============================================
-- 1️⃣ 회원 50명 + 가입 시점 6개월 분산
-- ============================================
INSERT INTO members (name, phone, age, gender, locker_number, display_mode, nickname, created_at) VALUES
-- 6개월 전 가입 (충성 고객 - 10명)
('김철수', '010-3001-0001', 28, 'male', 'A101', 'nickname', '펀치맨', NOW() - INTERVAL '180 days'),
('이상훈', '010-3001-0002', 35, 'male', 'A102', 'masked', NULL, NOW() - INTERVAL '175 days'),
('박재영', '010-3001-0003', 42, 'male', 'A103', 'nickname', '미트킹', NOW() - INTERVAL '170 days'),
('이영희', '010-3002-0001', 30, 'female', 'B101', 'nickname', '복싱여신', NOW() - INTERVAL '168 days'),
('최강호', '010-3001-0004', 31, 'male', 'A104', 'nickname', '잽잽이', NOW() - INTERVAL '165 days'),
('한지민', '010-3002-0002', 27, 'female', 'B102', 'masked', NULL, NOW() - INTERVAL '160 days'),
('정태민', '010-3001-0005', 26, 'male', 'A105', 'masked', NULL, NOW() - INTERVAL '155 days'),
('송미진', '010-3002-0003', 35, 'female', 'B103', 'nickname', '레이디불릿', NOW() - INTERVAL '150 days'),
('한지훈', '010-3001-0006', 38, 'male', 'A106', 'nickname', '훅마스터', NOW() - INTERVAL '145 days'),
('최서연', '010-3002-0004', 24, 'female', 'B104', 'masked', NULL, NOW() - INTERVAL '140 days'),

-- 4-5개월 전 가입 (10명)
('오성진', '010-3001-0007', 45, 'male', NULL, 'masked', NULL, NOW() - INTERVAL '135 days'),
('박은하', '010-3002-0005', 38, 'female', NULL, 'nickname', '워리어', NOW() - INTERVAL '130 days'),
('윤도현', '010-3001-0008', 29, 'male', 'A108', 'nickname', '복싱왕', NOW() - INTERVAL '125 days'),
('김다은', '010-3002-0006', 29, 'female', 'B106', 'masked', NULL, NOW() - INTERVAL '120 days'),
('장민호', '010-3001-0009', 33, 'male', 'A109', 'masked', NULL, NOW() - INTERVAL '115 days'),
('정수진', '010-3002-0007', 32, 'female', 'B107', 'nickname', '아이언피스트', NOW() - INTERVAL '110 days'),
('송재훈', '010-3001-0010', 40, 'male', 'A110', 'nickname', '체력왕', NOW() - INTERVAL '105 days'),
('오미경', '010-3002-0008', 41, 'female', 'B108', 'masked', NULL, NOW() - INTERVAL '100 days'),
('황성민', '010-3001-0011', 27, 'male', NULL, 'masked', NULL, NOW() - INTERVAL '95 days'),
('윤하나', '010-3002-0009', 26, 'female', 'B109', 'nickname', '벨벳해머', NOW() - INTERVAL '90 days'),

-- 2-3개월 전 가입 (15명)
('조현우', '010-3001-0012', 36, 'male', 'A112', 'nickname', '스파링킹', NOW() - INTERVAL '85 days'),
('이수빈', '010-3002-0010', 33, 'female', 'B110', 'masked', NULL, NOW() - INTERVAL '80 days'),
('강태우', '010-3001-0013', 41, 'male', 'A113', 'nickname', '강철주먹', NOW() - INTERVAL '75 days'),
('한예지', '010-3002-0011', 28, 'female', NULL, 'nickname', '플라잉걸', NOW() - INTERVAL '70 days'),
('임준호', '010-3001-0014', 32, 'male', 'A114', 'masked', NULL, NOW() - INTERVAL '65 days'),
('김유진', '010-3002-0012', 36, 'female', 'B112', 'masked', NULL, NOW() - INTERVAL '62 days'),
('서민준', '010-3001-0015', 25, 'male', 'A115', 'nickname', '신성', NOW() - INTERVAL '58 days'),
('박혜원', '010-3002-0013', 22, 'female', 'B113', 'nickname', '스피드퀸', NOW() - INTERVAL '55 days'),
('김도윤', '010-3003-0001', 17, 'male', NULL, 'nickname', '루키', NOW() - INTERVAL '52 days'),
('이서준', '010-3003-0002', 16, 'male', 'C102', 'masked', NULL, NOW() - INTERVAL '50 days'),
('박지민', '010-3003-0003', 14, 'male', NULL, 'nickname', '주니어킹', NOW() - INTERVAL '48 days'),
('한가은', '010-3003-0006', 17, 'female', NULL, 'masked', NULL, NOW() - INTERVAL '45 days'),
('최예준', '010-3003-0004', 15, 'male', 'C104', 'masked', NULL, NOW() - INTERVAL '42 days'),
('오시은', '010-3003-0007', 15, 'female', 'C107', 'nickname', '소녀파이터', NOW() - INTERVAL '40 days'),
('정하준', '010-3003-0005', 18, 'male', 'C105', 'nickname', '신예', NOW() - INTERVAL '38 days'),

-- 1개월 전 가입 (10명)
('김민준', '010-3004-0001', 11, 'male', NULL, 'nickname', '꼬마복서', NOW() - INTERVAL '32 days'),
('이주원', '010-3004-0002', 9, 'male', 'D102', 'masked', NULL, NOW() - INTERVAL '30 days'),
('박서윤', '010-3004-0003', 12, 'female', NULL, 'nickname', '리틀펀치', NOW() - INTERVAL '28 days'),
('윤채영', '010-3003-0008', 16, 'female', NULL, 'masked', NULL, NOW() - INTERVAL '25 days'),
('최민지', '010-3002-0014', 30, 'female', 'B114', 'hidden', NULL, NOW() - INTERVAL '22 days'),
('정나영', '010-3002-0015', 39, 'female', 'B115', 'masked', NULL, NOW() - INTERVAL '20 days'),
('장유나', '010-3003-0009', 14, 'female', 'C109', 'nickname', '리틀챔프', NOW() - INTERVAL '18 days'),
('최지호', '010-3004-0004', 10, 'male', 'D104', 'masked', NULL, NOW() - INTERVAL '15 days'),
('한예은', '010-3004-0006', 11, 'female', 'D106', 'masked', NULL, NOW() - INTERVAL '12 days'),
('정시우', '010-3004-0005', 8, 'male', NULL, 'nickname', '꼬마전사', NOW() - INTERVAL '10 days'),

-- 이번 주 신규 가입 (5명)
('오은호', '010-3004-0007', 10, 'male', NULL, 'nickname', '꼬마잽', NOW() - INTERVAL '6 days'),
('윤소율', '010-3004-0008', 12, 'female', 'D108', 'hidden', NULL, NOW() - INTERVAL '4 days'),
('송연우', '010-3003-0010', 13, 'female', NULL, 'hidden', NULL, NOW() - INTERVAL '3 days'),
('장지안', '010-3004-0009', 7, 'female', NULL, 'masked', NULL, NOW() - INTERVAL '2 days'),
('송태양', '010-3004-0010', 9, 'male', 'D110', 'nickname', '햇님이', NOW() - INTERVAL '1 day');

-- 어린이 보호자 정보
UPDATE members SET
    guardian_name = CASE phone
        WHEN '010-3004-0001' THEN '김부모' WHEN '010-3004-0002' THEN '이엄마'
        WHEN '010-3004-0003' THEN '박부모' WHEN '010-3004-0004' THEN '최아빠'
        WHEN '010-3004-0005' THEN '정엄마' WHEN '010-3004-0006' THEN '한부모'
        WHEN '010-3004-0007' THEN '오아빠' WHEN '010-3004-0008' THEN '윤부모'
        WHEN '010-3004-0009' THEN '장엄마' WHEN '010-3004-0010' THEN '송부모'
    END,
    guardian_phone = '010-9999-' || RIGHT(phone, 4),
    guardian_agreed_at = created_at
WHERE phone LIKE '010-3004-%';

-- 동의 처리
UPDATE members SET
    privacy_agreed_at = created_at,
    terms_agreed_at = created_at
WHERE phone LIKE '010-300%' AND privacy_agreed_at IS NULL;

-- ============================================
-- 2️⃣ 회원권 - 다양한 갱신 패턴 (충성도/탈퇴 표현)
-- ============================================
WITH new_members AS (
    SELECT id, name, phone, created_at, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
    FROM members WHERE phone LIKE '010-300%'
)
INSERT INTO memberships (member_id, type, start_date, end_date, status)
SELECT
    id,
    -- 회원권 종류 (가입 기간 따라)
    CASE
        WHEN created_at < NOW() - INTERVAL '120 days' THEN '6개월'  -- 오래된 회원
        WHEN created_at < NOW() - INTERVAL '60 days' THEN '3개월'
        WHEN created_at < NOW() - INTERVAL '20 days' THEN '1개월'
        ELSE '1개월'
    END,
    created_at::date,
    -- 만료일 (현재 회원권 기준)
    CASE
        -- 활성 회원 (대부분)
        WHEN rn % 8 = 0 THEN CURRENT_DATE - INTERVAL '15 days'   -- 만료 (탈퇴 추정)
        WHEN rn % 8 = 1 THEN CURRENT_DATE - INTERVAL '5 days'    -- 최근 만료
        WHEN rn % 8 = 2 THEN CURRENT_DATE + INTERVAL '3 days'    -- 만료 임박
        WHEN rn % 8 = 3 THEN CURRENT_DATE + INTERVAL '6 days'    -- 만료 임박
        WHEN rn % 8 = 4 THEN CURRENT_DATE + INTERVAL '30 days'   -- 활성
        WHEN rn % 8 = 5 THEN CURRENT_DATE + INTERVAL '60 days'   -- 활성
        WHEN rn % 8 = 6 THEN CURRENT_DATE + INTERVAL '120 days'  -- 활성
        ELSE CURRENT_DATE + INTERVAL '180 days'                  -- 활성
    END,
    'active'
FROM new_members;

-- 일부 충성 고객은 갱신 이력 추가 (이전 회원권)
WITH old_loyal AS (
    SELECT id FROM members
    WHERE created_at < NOW() - INTERVAL '120 days'
    LIMIT 8
)
INSERT INTO memberships (member_id, type, start_date, end_date, status)
SELECT id, '3개월',
    (NOW() - INTERVAL '180 days')::date,
    (NOW() - INTERVAL '90 days')::date,
    'expired'
FROM old_loyal;

-- ============================================
-- 3️⃣ 출석 기록 - 6개월치 (회원별 패턴)
-- ============================================
WITH active_members AS (
    SELECT m.id, m.name, m.phone, m.created_at, ROW_NUMBER() OVER (ORDER BY m.phone) AS rn
    FROM members m
    WHERE m.phone LIKE '010-300%'
)
INSERT INTO attendance (member_id, qr_data, checked_at)
SELECT
    am.id, 'mock-entry',
    (CURRENT_DATE - (i || ' days')::INTERVAL)::timestamp +
    INTERVAL '7 hours' + ((am.rn * 7 + i * 11) % 12 || ' hours')::INTERVAL +
    ((am.rn * 13 + i * 17) % 60 || ' minutes')::INTERVAL
FROM active_members am
CROSS JOIN generate_series(0, 180) AS i
WHERE
    -- 회원이 가입한 후의 날짜만
    (CURRENT_DATE - (i || ' days')::INTERVAL) >= am.created_at::date
    AND (
        -- 패턴별 출석률
        (am.rn <= 5 AND i % 1 = 0) OR              -- 매일 (5명)
        (am.rn <= 15 AND i % 2 = 0) OR             -- 격일 (10명)
        (am.rn <= 30 AND i % 3 IN (0, 1)) OR       -- 주 4-5회 (15명)
        (am.rn <= 40 AND i % 7 IN (0, 2, 4)) OR    -- 주 3회 (10명)
        (am.rn <= 47 AND i % 7 = 0) OR             -- 주 1회 (7명)
        (am.rn > 47 AND i % 14 = 0)                -- 거의 안옴 (3명)
    )
    -- 일부 회원은 중간에 탈퇴 (마지막 30일 출석 X)
    AND NOT (am.rn % 8 = 0 AND i < 30);

-- 오늘 운동 중인 회원 (퇴장 X)
WITH on_site AS (
    SELECT id FROM members
    WHERE phone IN ('010-3001-0001', '010-3001-0004', '010-3002-0001', '010-3001-0007', '010-3002-0003')
)
INSERT INTO attendance (member_id, qr_data, checked_at)
SELECT id, 'mock-entry', NOW() - INTERVAL '20 minutes' FROM on_site;

-- ============================================
-- 4️⃣ 운동 기록 - 출석한 날만 운동 (6개월치)
-- ============================================
WITH active_members AS (
    SELECT m.id, m.name, m.phone, m.created_at, ROW_NUMBER() OVER (ORDER BY m.phone) AS rn
    FROM members m
    WHERE m.phone LIKE '010-300%'
)
INSERT INTO workout_records (member_id, total_calories, duration_minutes, intensity, heart_rate_avg, recorded_at)
SELECT
    am.id,
    -- 칼로리 (패턴별)
    CASE
        WHEN am.rn <= 5 THEN 800 + (i * 7) % 250    -- 800-1050
        WHEN am.rn <= 15 THEN 600 + (i * 11) % 200  -- 600-800
        WHEN am.rn <= 30 THEN 450 + (i * 13) % 200  -- 450-650
        WHEN am.rn <= 40 THEN 350 + (i * 17) % 150  -- 350-500
        ELSE 200 + (i * 19) % 150                    -- 200-350
    END,
    -- 시간
    CASE
        WHEN am.rn <= 5 THEN 70 + (i % 30)
        WHEN am.rn <= 15 THEN 60 + (i % 25)
        WHEN am.rn <= 30 THEN 50 + (i % 20)
        WHEN am.rn <= 40 THEN 40 + (i % 15)
        ELSE 30 + (i % 15)
    END,
    -- 강도
    CASE
        WHEN am.rn <= 10 THEN 'hard'
        WHEN am.rn <= 30 THEN 'normal'
        ELSE 'low'
    END,
    -- 심박수
    CASE
        WHEN am.rn <= 5 THEN 165 + (i % 15)
        WHEN am.rn <= 15 THEN 150 + (i % 15)
        WHEN am.rn <= 30 THEN 135 + (i % 15)
        ELSE 120 + (i % 15)
    END,
    (CURRENT_DATE - (i || ' days')::INTERVAL)::timestamp +
    INTERVAL '18 hours' + ((am.rn * 5) % 60 || ' minutes')::INTERVAL
FROM active_members am
CROSS JOIN generate_series(0, 180) AS i
WHERE
    (CURRENT_DATE - (i || ' days')::INTERVAL) >= am.created_at::date
    AND (
        (am.rn <= 5 AND i % 1 = 0) OR
        (am.rn <= 15 AND i % 2 = 0) OR
        (am.rn <= 30 AND i % 3 IN (0, 1)) OR
        (am.rn <= 40 AND i % 7 IN (0, 2, 4)) OR
        (am.rn <= 47 AND i % 7 = 0) OR
        (am.rn > 47 AND i % 14 = 0)
    )
    AND NOT (am.rn % 8 = 0 AND i < 30);

-- ============================================
-- 5️⃣ 결제 내역 (가입 시 + 갱신 + PT)
-- ============================================
WITH ms_data AS (
    SELECT ms.member_id, ms.type, ms.start_date,
        CASE ms.type
            WHEN '1개월' THEN 150000
            WHEN '3개월' THEN 400000
            WHEN '6개월' THEN 700000
            WHEN '1년' THEN 1200000
        END AS price,
        ROW_NUMBER() OVER (PARTITION BY ms.member_id ORDER BY ms.start_date) AS rn
    FROM memberships ms
    WHERE ms.member_id IN (SELECT id FROM members WHERE phone LIKE '010-300%')
)
INSERT INTO payments (member_id, amount, method, item, paid_at)
SELECT
    member_id, price,
    CASE rn % 3 WHEN 0 THEN 'card' WHEN 1 THEN 'transfer' ELSE 'cash' END,
    '회원권',
    start_date::timestamp - INTERVAL '1 day'
FROM ms_data;

-- PT 결제 (충성 고객 일부)
WITH pt_members AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
    FROM members
    WHERE phone LIKE '010-300%' AND created_at < NOW() - INTERVAL '60 days'
    LIMIT 12
)
INSERT INTO payments (member_id, amount, method, item, paid_at)
SELECT id, 500000, 'card', 'PT', NOW() - (rn * 8 || ' days')::INTERVAL FROM pt_members;

-- ============================================
-- 6️⃣ 수업일지 (지난 30일)
-- ============================================
INSERT INTO lessons (title, content, lesson_date, target_group, created_at) VALUES
('기본기 - 잽 스트레이트 콤비네이션', E'준비운동: 줄넘기 3R\n메인: 거울 폼 체크 + 미트 5R\n쿨다운: 스트레칭 10분\n\n잽 후 스트레이트 타이밍 강조.', CURRENT_DATE, 'adult', NOW()),
('미트 훈련 - 스피드 강화', E'5R × 3분 (1분 휴식)\n1. 잽-잽-스트레이트\n2. 1-2-3\n3. 더블 잽-스트레이트\n4. 자유 콤비\n5. 스피드 맥스', CURRENT_DATE - 1, 'adult', NOW() - INTERVAL '1 day'),
('스파링 데이', E'주 1회 정기 스파링.\n참가: 김철수, 박재영, 최강호, 윤도현', CURRENT_DATE - 3, 'adult', NOW() - INTERVAL '3 days'),
('컨디셔닝 서킷', E'복싱은 체력!\n버피/마운틴/셰도우 × 5세트', CURRENT_DATE - 5, 'adult', NOW() - INTERVAL '5 days'),
('헤비백 - 파워 펀치', E'헤비백 5R × 3분, 파워 위주', CURRENT_DATE - 7, 'adult', NOW() - INTERVAL '7 days'),
('스파링 - 파워 vs 스피드', E'2명씩 매칭, 각자 스타일 분석', CURRENT_DATE - 10, 'adult', NOW() - INTERVAL '10 days'),
('체급별 훈련', E'체급에 따라 다른 콤비 연습', CURRENT_DATE - 14, 'adult', NOW() - INTERVAL '14 days'),

('고등반 기본기', E'잽-스트레이트 정확도', CURRENT_DATE, 'high', NOW()),
('고등반 컨디셔닝', E'체력 강화 서킷', CURRENT_DATE - 2, 'high', NOW() - INTERVAL '2 days'),
('고등반 미트', E'스피드 미트', CURRENT_DATE - 4, 'high', NOW() - INTERVAL '4 days'),
('고등반 - 시험 응원', E'시험기간 + 1명씩 자유 운동', CURRENT_DATE - 8, 'high', NOW() - INTERVAL '8 days'),

('중등반 - 폼 잡기', E'올바른 자세', CURRENT_DATE - 1, 'middle', NOW() - INTERVAL '1 day'),
('중등반 - 풋워크', E'스텝 훈련', CURRENT_DATE - 3, 'middle', NOW() - INTERVAL '3 days'),
('중등반 - 게임 시간', E'재미있는 복싱 게임', CURRENT_DATE - 6, 'middle', NOW() - INTERVAL '6 days'),
('중등반 - 단합 운동', E'서로 미트 들어주기', CURRENT_DATE - 12, 'middle', NOW() - INTERVAL '12 days'),

('초등반 - 즐거운 복싱', E'기본 자세부터', CURRENT_DATE, 'elementary', NOW()),
('초등반 - 줄넘기 챔피언', E'줄넘기 대회!', CURRENT_DATE - 2, 'elementary', NOW() - INTERVAL '2 days'),
('초등반 - 미트 도전', E'코치님 미트 도전', CURRENT_DATE - 5, 'elementary', NOW() - INTERVAL '5 days'),
('초등반 - 체력 게임', E'재미있는 운동 게임', CURRENT_DATE - 8, 'elementary', NOW() - INTERVAL '8 days'),
('초등반 - 댄스 워밍업', E'음악에 맞춰 워밍업', CURRENT_DATE - 11, 'elementary', NOW() - INTERVAL '11 days'),

('🥊 정기 청소 안내', E'토요일 전체 청소.', CURRENT_DATE - 4, 'all', NOW() - INTERVAL '4 days'),
('🎉 신년 단합 운동', E'전체 회원 단합!', CURRENT_DATE - 18, 'all', NOW() - INTERVAL '18 days'),
('🏆 칼로리 챔피언 발표', E'이번 달 챔피언 시상식', CURRENT_DATE - 25, 'all', NOW() - INTERVAL '25 days');

-- ============================================
-- 7️⃣ 공지사항
-- ============================================
INSERT INTO notices (title, content, priority, target_age, target_gender, target_status, target_count, created_at) VALUES
('🚨 시설 점검 - 일요일 휴무', E'이번 일요일 시설 점검으로 휴무합니다.\n월요일부터 정상 운영.', 'urgent', '{}', '{}', '{}', 50, NOW() - INTERVAL '2 days'),
('💪 신년 이벤트 - PT 4회 무료', E'회원권 결제 시 PT 4회 증정 🎁\n선착순 10명!', 'important', '{}', '{}', '{"active"}', 35, NOW() - INTERVAL '5 days'),
('⚠️ 회원권 만료 임박 안내', E'7일 이내 만료 회원분 빠른 갱신 부탁드려요!\n갱신 시 5% 할인 🎉', 'important', '{}', '{}', '{"expiring_soon"}', 6, NOW() - INTERVAL '1 day'),
('📅 운영 시간 변경', E'평일: 06-23시\n주말: 08-21시\n일요일: 휴무', 'normal', '{}', '{}', '{}', 50, NOW() - INTERVAL '7 days'),
('🥊 성인 신규 프로그램', E'화/목 19시 \"고강도 펀치 콤보\"', 'normal', '{"adult"}', '{}', '{"active"}', 25, NOW() - INTERVAL '3 days'),
('👧 어린이반 학부모 안내', E'매월 마지막 주 토요일 부모 참관 데이', 'normal', '{"elementary"}', '{}', '{}', 10, NOW() - INTERVAL '4 days'),
('🎓 청소년 시험기간 일정', E'시험기간 출석 부담 X. 보강 가능', 'normal', '{"middle", "high"}', '{}', '{"active"}', 8, NOW() - INTERVAL '6 days'),
('💄 여성 회원 전용 시간', E'매주 수요일 10-12시 여성 전용', 'normal', '{}', '{"female"}', '{"active"}', 12, NOW() - INTERVAL '8 days'),
('☕ 정수기 교체 완료', E'신형 정수기 설치 완료!', 'normal', '{}', '{}', '{}', 50, NOW() - INTERVAL '10 days'),
('🏆 이번 달 칼로리 챔피언', E'🥇 김철수 25,840 kcal\n🥈 최강호 24,120\n🥉 박재영 22,580', 'normal', '{}', '{}', '{}', 50, NOW() - INTERVAL '12 days'),
('📢 다음 주 단체 사진 촬영', E'단체 사진 촬영 예정. 운동 후 잠깐!', 'normal', '{}', '{}', '{}', 50, NOW() - INTERVAL '15 days'),
('🎁 신규 회원 환영 이벤트', E'새 회원 가입 시 운동복 1벌 증정', 'normal', '{}', '{}', '{}', 50, NOW() - INTERVAL '20 days');

-- ============================================
-- 완료 요약
-- ============================================
SELECT
    '🎉 메가 목업 완료' AS 상태,
    (SELECT COUNT(*) FROM members WHERE phone LIKE '010-300%') AS 회원수,
    (SELECT COUNT(*) FROM memberships WHERE member_id IN (SELECT id FROM members WHERE phone LIKE '010-300%')) AS 회원권수,
    (SELECT COUNT(*) FROM attendance WHERE member_id IN (SELECT id FROM members WHERE phone LIKE '010-300%')) AS 출석기록,
    (SELECT COUNT(*) FROM workout_records WHERE member_id IN (SELECT id FROM members WHERE phone LIKE '010-300%')) AS 운동기록,
    (SELECT COUNT(*) FROM payments WHERE member_id IN (SELECT id FROM members WHERE phone LIKE '010-300%')) AS 결제건수,
    (SELECT COUNT(*) FROM lessons WHERE created_at > NOW() - INTERVAL '30 days') AS 수업일지,
    (SELECT COUNT(*) FROM notices WHERE created_at > NOW() - INTERVAL '30 days') AS 공지사항;
