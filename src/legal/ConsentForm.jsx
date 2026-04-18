import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BUSINESS_INFO } from './PrivacyPolicy'

/**
 * 인쇄용 동의서
 * URL: /consent-form?name=홍길동&phone=010-1234-5678&age=25
 * 관장님이 회원 정보 입력 후 [동의서 출력] 클릭하면 새 창에서 열림
 * 회원 이름이 자동으로 채워진 채로 인쇄됨
 */
export default function ConsentForm() {
    const [params] = useSearchParams()
    const name = params.get('name') || ''
    const phone = params.get('phone') || ''
    const age = params.get('age') || ''
    const today = new Date().toLocaleDateString('ko-KR')

    useEffect(() => {
        // 페이지 로드되면 자동으로 인쇄 다이얼로그 띄우기
        setTimeout(() => window.print(), 500)
    }, [])

    return (
        <div className="cf-page">
            <div className="cf-paper">
                <div className="cf-header">
                    <h1>회원 등록 및 개인정보 처리 동의서</h1>
                    <div className="cf-business-name">{BUSINESS_INFO.name}</div>
                </div>

                {/* 회원 정보 */}
                <table className="cf-info-table">
                    <tbody>
                        <tr>
                            <th>이름</th>
                            <td>{name || '___________________'}</td>
                            <th>나이</th>
                            <td>{age || '_____'} 세</td>
                        </tr>
                        <tr>
                            <th>전화번호</th>
                            <td colSpan={3}>{phone || '___________________'}</td>
                        </tr>
                        <tr>
                            <th>등록일</th>
                            <td colSpan={3}>{today}</td>
                        </tr>
                    </tbody>
                </table>

                {/* 동의 사항 */}
                <div className="cf-section">
                    <h2>1. 개인정보 수집·이용 동의 (필수)</h2>
                    <table className="cf-consent-table">
                        <thead>
                            <tr>
                                <th>수집 항목</th>
                                <th>이용 목적</th>
                                <th>보유 기간</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>이름, 전화번호, 나이, 성별</td>
                                <td>회원 식별 및 관리</td>
                                <td rowSpan={3}>회원 탈퇴 시까지<br />(결제기록은 5년)</td>
                            </tr>
                            <tr>
                                <td>출석 기록, 운동 기록</td>
                                <td>출석 관리 및 운동 데이터 제공</td>
                            </tr>
                            <tr>
                                <td>회원권/결제 내역</td>
                                <td>이용권 관리 및 환불 처리</td>
                            </tr>
                        </tbody>
                    </table>
                    <p className="cf-notice">
                        ※ 위 개인정보 수집·이용에 동의하지 않을 권리가 있으며, 동의를 거부할 경우 회원 가입이 제한됩니다.
                    </p>
                    <div className="cf-checkbox-row">
                        <span className="cf-checkbox">☐ 동의함</span>
                        <span className="cf-checkbox">☐ 동의하지 않음</span>
                    </div>
                </div>

                <div className="cf-section">
                    <h2>2. 이용약관 동의 (필수)</h2>
                    <p className="cf-text">
                        본인은 {BUSINESS_INFO.name}의 이용약관(시설 이용 규정, 환불 규정 등)을 충분히 안내받고
                        이에 동의합니다.
                    </p>
                    <div className="cf-checkbox-row">
                        <span className="cf-checkbox">☐ 동의함</span>
                        <span className="cf-checkbox">☐ 동의하지 않음</span>
                    </div>
                </div>

                <div className="cf-section">
                    <h2>3. 마케팅·이벤트 알림 수신 동의 (선택)</h2>
                    <p className="cf-text">
                        센터의 이벤트, 할인 혜택, 신규 프로그램 안내 등을 SMS/카카오톡 등으로 수신하는 것에 동의합니다.
                    </p>
                    <div className="cf-checkbox-row">
                        <span className="cf-checkbox">☐ 동의함</span>
                        <span className="cf-checkbox">☐ 동의하지 않음</span>
                    </div>
                </div>

                {age && Number(age) < 14 && (
                    <div className="cf-section cf-guardian-section">
                        <h2>4. 법정대리인 동의 (만 14세 미만 필수)</h2>
                        <p className="cf-text">
                            본인은 위 회원의 법정대리인(부모)으로서 회원 가입 및 개인정보 처리에 동의합니다.
                        </p>
                        <table className="cf-info-table">
                            <tbody>
                                <tr>
                                    <th>보호자 이름</th>
                                    <td>___________________</td>
                                    <th>회원과의 관계</th>
                                    <td>___________________</td>
                                </tr>
                                <tr>
                                    <th>보호자 전화번호</th>
                                    <td colSpan={3}>___________________</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="cf-signature-row">
                            <span>법정대리인 서명:</span>
                            <span className="cf-sign-line">___________________ (인)</span>
                        </div>
                    </div>
                )}

                {/* 서명란 */}
                <div className="cf-signature-section">
                    <p className="cf-text">
                        본인은 위 사항을 충분히 이해하였으며, 자유로운 의사로 서명합니다.
                    </p>
                    <div className="cf-signature-final">
                        <div className="cf-sign-date">{today}</div>
                        <div className="cf-sign-name">
                            성명: <span>{name || '___________________'}</span>
                            <span className="cf-sign-final-line">서명: ___________________ (인)</span>
                        </div>
                    </div>
                </div>

                {/* 사업자 정보 */}
                <div className="cf-business-footer">
                    <p>{BUSINESS_INFO.name} | 대표자: {BUSINESS_INFO.representative}</p>
                    <p>주소: {BUSINESS_INFO.address}</p>
                    <p>연락처: {BUSINESS_INFO.phone} | 이메일: {BUSINESS_INFO.email}</p>
                </div>

                {/* 인쇄 안내 (화면에서만 보임) */}
                <div className="cf-print-help no-print">
                    <button onClick={() => window.print()} className="cf-print-btn">
                        🖨️ 다시 인쇄
                    </button>
                    <p>인쇄가 자동으로 시작되지 않으면 위 버튼을 누르거나 Ctrl+P를 눌러주세요.</p>
                </div>
            </div>
        </div>
    )
}
