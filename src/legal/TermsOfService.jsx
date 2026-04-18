import { useNavigate } from 'react-router-dom'
import { BUSINESS_INFO } from './PrivacyPolicy'

export default function TermsOfService() {
    const navigate = useNavigate()

    return (
        <div className="legal-page">
            <div className="legal-container">
                <button className="legal-back" onClick={() => navigate(-1)}>← 돌아가기</button>
                <h1 className="legal-title">이용약관</h1>
                <p className="legal-effective">시행일: {BUSINESS_INFO.effectiveDate}</p>

                <section className="legal-section">
                    <h2>제1조 (목적)</h2>
                    <p>
                        본 약관은 {BUSINESS_INFO.name}(이하 "사업자")이 제공하는 회원관리 서비스(이하 "서비스")의 이용과 관련하여
                        사업자와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>제2조 (정의)</h2>
                    <ol>
                        <li>"서비스"란 사업자가 제공하는 체육관 회원관리, 출석, 운동 기록, 공지 알림 등 일체의 서비스를 의미합니다.</li>
                        <li>"회원"이란 본 약관에 동의하고 사업자가 제공하는 서비스를 이용하는 자를 말합니다.</li>
                        <li>"이용권"이란 회원이 일정 기간 서비스 및 시설을 이용할 수 있는 권리를 말합니다.</li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제3조 (약관의 효력 및 변경)</h2>
                    <ol>
                        <li>본 약관은 회원이 동의함으로써 효력이 발생합니다.</li>
                        <li>사업자는 필요시 약관을 변경할 수 있으며, 변경된 약관은 시행일 7일 전부터 공지합니다.</li>
                        <li>변경된 약관에 동의하지 않는 회원은 회원 탈퇴를 요청할 수 있습니다.</li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제4조 (회원 가입 및 관리)</h2>
                    <ol>
                        <li>회원 가입은 사업자가 정한 절차에 따라 본 약관 및 개인정보처리방침에 동의함으로써 성립됩니다.</li>
                        <li>만 14세 미만은 법정대리인의 동의가 있어야 가입할 수 있습니다.</li>
                        <li>회원은 등록한 정보에 변경이 있을 경우 즉시 사업자에게 알려야 합니다.</li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제5조 (서비스의 제공 및 변경)</h2>
                    <ol>
                        <li>사업자는 회원에게 다음과 같은 서비스를 제공합니다.
                            <ul>
                                <li>회원권/이용권 관리</li>
                                <li>출석 체크 및 기록</li>
                                <li>운동 기록 조회</li>
                                <li>공지사항 및 알림</li>
                                <li>수업일지 조회</li>
                            </ul>
                        </li>
                        <li>사업자는 시스템 점검, 유지보수 등의 사유로 서비스를 일시 중단할 수 있으며, 사전에 공지합니다.</li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제6조 (회원의 의무)</h2>
                    <ol>
                        <li>회원은 본 약관, 사업자의 운영 정책 및 관계 법령을 준수해야 합니다.</li>
                        <li>회원은 본인의 개인정보를 정확히 등록·관리해야 하며, 변경 사항은 즉시 갱신해야 합니다.</li>
                        <li>회원은 다음 행위를 해서는 안 됩니다.
                            <ul>
                                <li>타인의 정보를 도용하는 행위</li>
                                <li>대리 출석 등 부정 사용 행위</li>
                                <li>서비스 운영을 방해하는 행위</li>
                                <li>다른 회원에게 위해를 가하는 행위</li>
                            </ul>
                        </li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제7조 (이용권 환불)</h2>
                    <ol>
                        <li>회원은 「체육시설의 설치·이용에 관한 법률」 등 관련 법령에 따라 이용권 환불을 요청할 수 있습니다.</li>
                        <li>환불 금액은 결제 수단, 이용 일수, 위약금 등을 고려하여 산정합니다.</li>
                        <li>구체적인 환불 기준은 사업자의 환불 규정에 따릅니다.</li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제8조 (회원 탈퇴 및 자격 상실)</h2>
                    <ol>
                        <li>회원은 언제든지 탈퇴를 요청할 수 있습니다.</li>
                        <li>회원이 다음 사유에 해당하는 경우 사업자는 회원 자격을 제한·정지·상실시킬 수 있습니다.
                            <ul>
                                <li>가입 시 허위 정보를 등록한 경우</li>
                                <li>타인의 서비스 이용을 방해한 경우</li>
                                <li>관계 법령 또는 본 약관을 위반한 경우</li>
                            </ul>
                        </li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제9조 (사업자의 면책)</h2>
                    <ol>
                        <li>사업자는 천재지변, 불가항력 등으로 인한 서비스 중단에 대해서는 책임을 지지 않습니다.</li>
                        <li>회원의 귀책사유로 인한 서비스 이용 장애에 대해서는 책임을 지지 않습니다.</li>
                        <li>회원이 시설 이용 중 발생한 부상 등에 대해서는 별도의 시설이용 약관 및 책임 규정에 따릅니다.</li>
                    </ol>
                </section>

                <section className="legal-section">
                    <h2>제10조 (분쟁 해결)</h2>
                    <ol>
                        <li>본 약관과 관련하여 분쟁이 발생한 경우, 사업자와 회원은 상호 협의하여 해결합니다.</li>
                        <li>협의가 이루어지지 않을 경우 「민사소송법」에 따른 관할 법원에서 해결합니다.</li>
                    </ol>
                </section>

                <div className="legal-footer-info">
                    <p><strong>사업자 정보</strong></p>
                    <p>상호: {BUSINESS_INFO.name}</p>
                    <p>대표자: {BUSINESS_INFO.representative}</p>
                    <p>연락처: {BUSINESS_INFO.phone}</p>
                </div>
            </div>
        </div>
    )
}
