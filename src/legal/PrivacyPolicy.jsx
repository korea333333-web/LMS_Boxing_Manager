import { useNavigate } from 'react-router-dom'
import { useSettings } from '../lib/useSettings'

// 하위 호환성을 위해 export 유지 (다른 곳에서 사용 중)
// 실제 데이터는 useSettings()에서 동적으로 가져옴
export const BUSINESS_INFO = {
    name: '내 체육관',
    representative: '',
    address: '',
    businessNumber: '',
    email: '',
    phone: '',
    privacyOfficer: '',
    privacyOfficerEmail: '',
    effectiveDate: '2026-04-18',
}

export default function PrivacyPolicy() {
    const navigate = useNavigate()
    const { settings } = useSettings()
    const info = {
        name: settings.business_name || settings.gym_name || '내 체육관',
        representative: settings.business_representative || '[대표자 이름]',
        address: settings.business_address || '[사업자 주소]',
        businessNumber: settings.business_number || '[사업자등록번호]',
        email: settings.gym_email || '[연락 이메일]',
        phone: settings.gym_phone || '[연락 전화번호]',
        privacyOfficer: settings.privacy_officer_name || settings.business_representative || '[개인정보보호책임자]',
        privacyOfficerEmail: settings.privacy_officer_email || settings.gym_email || '[이메일]',
        privacyOfficerPhone: settings.privacy_officer_phone || settings.gym_phone || '[연락처]',
        effectiveDate: '2026-04-18',
    }

    return (
        <div className="legal-page">
            <div className="legal-container">
                <button className="legal-back" onClick={() => navigate(-1)}>← 돌아가기</button>
                <h1 className="legal-title">개인정보처리방침</h1>
                <p className="legal-effective">시행일: {info.effectiveDate}</p>

                <section className="legal-section">
                    <p>
                        {info.name}(이하 "사업자")은 회원의 개인정보를 중요시하며,
                        「개인정보 보호법」을 준수하기 위하여 노력하고 있습니다.
                        사업자는 본 개인정보처리방침을 통하여 회원이 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며,
                        개인정보 보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>제1조 (개인정보의 처리 목적)</h2>
                    <p>사업자는 다음의 목적을 위하여 개인정보를 처리합니다.</p>
                    <ol>
                        <li>회원 가입 및 관리: 회원 식별, 회원자격 유지·관리, 서비스 부정이용 방지</li>
                        <li>회원권/이용권 관리: 회원권 결제, 만료 안내, 출석 관리</li>
                        <li>운동 데이터 관리: 출석 기록, 운동 기록(칼로리, 시간, 강도) 분석 및 회원 본인 제공</li>
                        <li>공지사항 및 알림 전달: 공지, 이벤트, 마감 임박 안내</li>
                        <li>민원 처리 및 분쟁 해결</li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제2조 (처리하는 개인정보 항목)</h2>
                    <p>사업자는 다음의 개인정보 항목을 처리하고 있습니다.</p>
                    <h3>필수 항목</h3>
                    <ul>
                        <li>이름</li>
                        <li>전화번호</li>
                        <li>나이</li>
                        <li>성별</li>
                    </ul>
                    <h3>선택 항목</h3>
                    <ul>
                        <li>닉네임 (모니터/랭킹 표시용)</li>
                    </ul>
                    <h3>서비스 이용 과정에서 자동 생성·수집되는 정보</h3>
                    <ul>
                        <li>출석 기록 (입장/퇴장 시각)</li>
                        <li>운동 기록 (칼로리, 운동 시간, 운동 강도)</li>
                        <li>회원권/결제 내역</li>
                        <li>락커 번호</li>
                        <li>코치 메모</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제2조의2 (체육관 내 모니터 표시)</h2>
                    <p>
                        사업자는 회원의 동기부여 및 체육관 분위기 조성을 위해 체육관 내부에 설치된
                        모니터(TV·디스플레이)에 운동 랭킹, 출석 현황 등을 표시할 수 있습니다.
                    </p>
                    <ol>
                        <li>
                            표시되는 항목: 회원 식별명(아래 제2호의 방식 중 회원이 선택), 운동 칼로리 합계, 운동 시간,
                            출석 횟수, 랭킹 순위
                        </li>
                        <li>
                            회원 식별명 표시 방식 (회원이 선택)
                            <ul>
                                <li><strong>닉네임 사용</strong>: 회원이 등록한 닉네임으로 표시 (예: "펀치맨")</li>
                                <li><strong>마스킹 이름 사용 (기본)</strong>: 이름의 가운데 글자를 *로 가려서 표시 (예: 김철수 → "김*수")</li>
                                <li><strong>표시 안 함</strong>: 모니터 및 랭킹에서 본인 정보를 제외</li>
                            </ul>
                        </li>
                        <li>
                            회원은 언제든지 본인의 표시 방식을 변경하거나, 모니터 표시 자체를 거부할 수 있습니다.
                        </li>
                        <li>
                            부적절하거나 타인을 불쾌하게 할 수 있는 닉네임은 사업자가 사전 통보 후 표시를 중지하거나
                            마스킹 이름으로 변경할 수 있습니다.
                        </li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제3조 (개인정보의 보유 및 이용 기간)</h2>
                    <ol>
                        <li>회원 정보: 회원 탈퇴 시까지 (단, 관계 법령에 따라 보존 필요시 해당 기간 동안 보관)</li>
                        <li>결제 기록: 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 5년</li>
                        <li>출석/운동 기록: 회원 탈퇴 후 즉시 파기</li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제4조 (개인정보의 제3자 제공)</h2>
                    <p>
                        사업자는 회원의 개인정보를 제1조에 명시한 목적 범위 내에서만 처리하며,
                        회원의 별도 동의, 법률의 특별한 규정 등 「개인정보 보호법」에 해당하는 경우 외에는 제3자에게 제공하지 않습니다.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>제5조 (개인정보 처리의 위탁)</h2>
                    <p>사업자는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
                    <table className="legal-table">
                        <thead>
                            <tr>
                                <th>수탁자</th>
                                <th>위탁 업무</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Supabase Inc.</td>
                                <td>데이터베이스 호스팅 및 관리 (해외)</td>
                            </tr>
                            <tr>
                                <td>Vercel Inc.</td>
                                <td>웹 서비스 호스팅 (해외)</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section className="legal-section">
                    <h2>제6조 (정보주체의 권리·의무 및 행사 방법)</h2>
                    <p>회원은 언제든지 다음의 권리를 행사할 수 있습니다.</p>
                    <ol>
                        <li>개인정보 열람 요구</li>
                        <li>개인정보 정정·삭제 요구</li>
                        <li>처리 정지 요구</li>
                        <li>회원 탈퇴 요구</li>
                    </ol>
                    <p>
                        권리 행사는 사업자에게 서면, 전자우편, 전화 등을 통하여 하실 수 있으며,
                        사업자는 지체 없이 조치하겠습니다.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>제7조 (만 14세 미만 아동의 개인정보 처리)</h2>
                    <p>
                        사업자는 만 14세 미만 아동의 개인정보를 처리할 때
                        법정대리인(부모)의 동의를 받아 처리합니다.
                        법정대리인은 아동의 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>제8조 (개인정보의 안전성 확보 조치)</h2>
                    <ol>
                        <li>관리적 조치: 내부관리계획 수립 및 시행, 접근 권한 관리</li>
                        <li>기술적 조치: 데이터베이스 암호화, 접근통제 시스템(Supabase RLS)</li>
                        <li>물리적 조치: 데이터센터 접근 통제 (위탁사 보안 정책)</li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제9조 (개인정보보호책임자)</h2>
                    <div className="legal-info-box">
                        <p><strong>개인정보보호책임자</strong></p>
                        <p>이름: {info.privacyOfficer}</p>
                        <p>이메일: {info.privacyOfficerEmail}</p>
                        <p>연락처: {info.phone}</p>
                    </div>
                    <p>
                        회원은 사업자의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을
                        개인정보보호책임자에게 문의하실 수 있습니다.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>제10조 (권익침해 구제 방법)</h2>
                    <p>개인정보 침해에 대한 신고 및 상담이 필요하신 경우 아래 기관에 문의하실 수 있습니다.</p>
                    <ul>
                        <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
                        <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
                        <li>대검찰청 사이버수사과: (국번없이) 1301</li>
                        <li>경찰청 사이버수사국: (국번없이) 182</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>제11조 (개인정보처리방침의 변경)</h2>
                    <p>
                        본 개인정보처리방침은 시행일로부터 적용되며,
                        법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는
                        변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                    </p>
                </section>

                <div className="legal-footer-info">
                    <p><strong>사업자 정보</strong></p>
                    <p>상호: {info.name}</p>
                    <p>대표자: {info.representative}</p>
                    <p>주소: {info.address}</p>
                    <p>사업자등록번호: {info.businessNumber}</p>
                    <p>연락처: {info.phone}</p>
                    <p>이메일: {info.email}</p>
                </div>
            </div>
        </div>
    )
}
