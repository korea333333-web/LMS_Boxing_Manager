// 모니터/랭킹에 표시할 이름 결정 유틸리티

// 한국어/영어 금칙어 (간단 리스트, 필요 시 확장)
const BLOCKED_WORDS = [
    // 욕설/비속어
    '바보', '병신', '시발', '씨발', '개새끼', '존나', '좆', '븅신', '미친',
    '꺼져', '닥쳐', '죽어', '쳐죽',
    // 성적 표현
    '섹스', '야한', '변태', '성기', '자위', '오나니',
    // 영어
    'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'sex', 'porn',
    // 차별/혐오
    '장애인', '병자', '미친놈', '미친년',
    // 도배/광고성
    'http', 'www.', '.com', '.net', '광고',
]

/**
 * 닉네임이 부적절한지 확인
 * @param {string} nickname
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkNickname(nickname) {
    if (!nickname || typeof nickname !== 'string') {
        return { ok: false, reason: '닉네임을 입력해주세요' }
    }
    const trimmed = nickname.trim()
    if (trimmed.length < 1) {
        return { ok: false, reason: '닉네임을 입력해주세요' }
    }
    if (trimmed.length > 12) {
        return { ok: false, reason: '닉네임은 12자 이하여야 합니다' }
    }
    const lower = trimmed.toLowerCase()
    for (const word of BLOCKED_WORDS) {
        if (lower.includes(word.toLowerCase())) {
            return { ok: false, reason: '사용할 수 없는 단어가 포함되어 있습니다' }
        }
    }
    // 특수문자 제한 (한글/영문/숫자/공백/일부 기호만 허용)
    if (!/^[가-힣a-zA-Z0-9\s\-_!?.♥♡★☆♪]+$/.test(trimmed)) {
        return { ok: false, reason: '특수문자는 사용할 수 없습니다' }
    }
    return { ok: true }
}

/**
 * 이름 마스킹 (가운데 글자를 *로)
 * - 김철수 → 김*수
 * - 이영 → 이*
 * - Park → P**k
 */
export function maskName(name) {
    if (!name) return '회원'
    const trimmed = name.trim()
    if (trimmed.length <= 1) return trimmed
    if (trimmed.length === 2) return trimmed[0] + '*'
    if (trimmed.length === 3) return trimmed[0] + '*' + trimmed[2]
    // 4글자 이상: 첫글자 + ** + 마지막글자
    return trimmed[0] + '*'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1]
}

/**
 * 회원 객체에서 모니터/랭킹에 표시할 이름 결정
 * @param {Object} member - { name, nickname, display_mode, nickname_blocked }
 * @returns {string|null} 표시할 이름. null이면 표시 안 함
 */
export function getDisplayName(member) {
    if (!member) return null
    const mode = member.display_mode || 'masked'

    // 표시 안 함 선택한 경우
    if (mode === 'hidden') return null

    // 닉네임 사용 모드
    if (mode === 'nickname') {
        // 닉네임이 차단되었거나 비어있으면 마스킹 이름으로 폴백
        if (member.nickname_blocked || !member.nickname) {
            return maskName(member.name)
        }
        return member.nickname
    }

    // 마스킹 모드 (기본)
    return maskName(member.name)
}
