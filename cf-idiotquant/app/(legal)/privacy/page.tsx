import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "개인정보 처리방침",
    robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = "2026년 6월 19일";
const CONTACT_EMAIL = "funkydj1@naver.com";

export default function PrivacyPage() {
    return (
        <div className="text-neutral-700 dark:text-neutral-300">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-1.5">개인정보 처리방침</h1>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-8">시행일: {EFFECTIVE_DATE}</p>

            <p className="text-sm leading-relaxed mb-7">
                IDIOTQUANT(이하 “서비스”)은 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의
                개인정보를 보호하기 위하여 다음과 같은 처리방침을 두고 있습니다.
            </p>

            <Section title="제1조 (수집하는 개인정보 항목)">
                <p>서비스는 회원 가입 및 서비스 제공을 위하여 다음의 개인정보를 수집합니다.</p>
                <List items={[
                    "카카오 로그인 시: 카카오 계정 식별자(회원 고유번호), 이름(닉네임), 이메일 주소",
                    "서비스 이용 과정에서 자동 생성·수집: 접속 일시, 서비스 이용 기록, 관심 종목 등 이용자가 서비스 내에서 저장한 정보",
                    "인증 유지를 위한 쿠키(로그인 토큰)",
                ]} />
            </Section>

            <Section title="제2조 (개인정보의 수집 및 이용 목적)">
                <List items={[
                    "회원 식별 및 로그인 등 회원제 서비스 제공",
                    "관심 종목 저장 등 이용자 맞춤형 기능 제공",
                    "서비스 부정 이용 방지 및 안정적 운영",
                    "서비스 이용 문의 응대 및 공지사항 전달",
                ]} />
            </Section>

            <Section title="제3조 (개인정보의 보유 및 이용기간)">
                <List items={[
                    "서비스는 원칙적으로 회원 탈퇴 시 수집한 개인정보를 지체 없이 파기합니다.",
                    "다만 서비스의 안정적 운영 및 부정 재가입 방지를 위하여 회원 탈퇴 후 일정 기간 동안 재가입 제한에 필요한 최소한의 식별 정보를 보관할 수 있습니다.",
                    "관련 법령에 따라 보존할 필요가 있는 경우에는 해당 법령에서 정한 기간 동안 보관합니다.",
                ]} />
            </Section>

            <Section title="제4조 (개인정보의 제3자 제공)">
                <p>
                    서비스는 이용자의 개인정보를 본 방침에서 명시한 범위를 초과하여 제3자에게 제공하지
                    않습니다. 다만, 법령에 특별한 규정이 있거나 수사기관의 적법한 요청이 있는 경우에는
                    예외로 합니다.
                </p>
            </Section>

            <Section title="제5조 (개인정보 처리의 위탁 및 국외 이전)">
                <p>서비스는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
                <List items={[
                    "카카오(Kakao): 소셜 로그인 인증 (이용자가 카카오 로그인을 선택한 경우)",
                    "Cloudflare, Inc.: 서비스 호스팅 및 데이터 저장·처리 (서버 소재지: 국외). 이용자의 정보는 서비스 제공에 필요한 범위 내에서 국외에 저장·처리될 수 있습니다.",
                ]} />
            </Section>

            <Section title="제6조 (정보주체의 권리·의무 및 행사방법)">
                <List items={[
                    "이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요구할 수 있습니다.",
                    "이용자는 서비스 내 ‘회원 탈퇴’ 기능을 통하여 개인정보의 삭제를 직접 요청할 수 있습니다.",
                    "권리 행사는 아래 개인정보 보호책임자에게 이메일로 요청할 수 있으며, 서비스는 지체 없이 조치합니다.",
                ]} />
            </Section>

            <Section title="제7조 (개인정보의 파기절차 및 방법)">
                <List items={[
                    "파기절차: 이용 목적이 달성되거나 보유기간이 경과한 개인정보는 내부 방침 및 관련 법령에 따라 파기합니다.",
                    "파기방법: 전자적 파일 형태로 저장된 개인정보는 복구·재생이 불가능한 기술적 방법으로 삭제합니다.",
                ]} />
            </Section>

            <Section title="제8조 (개인정보의 안전성 확보조치)">
                <List items={[
                    "개인정보에 대한 접근 권한을 최소한의 인원으로 제한합니다.",
                    "개인정보가 저장·전송되는 구간에 대하여 암호화 등 보안 조치를 적용합니다.",
                    "외부 침입에 대비한 접근 통제 등 기술적 보호 조치를 적용합니다.",
                ]} />
            </Section>

            <Section title="제9조 (쿠키의 운용 및 거부)">
                <List items={[
                    "서비스는 로그인 상태 유지를 위하여 인증 쿠키를 사용합니다.",
                    "이용자는 웹 브라우저 설정을 통하여 쿠키 저장을 거부할 수 있으나, 이 경우 로그인이 필요한 일부 서비스 이용이 제한될 수 있습니다.",
                ]} />
            </Section>

            <Section title="제10조 (개인정보 보호책임자)" highlight>
                <p>
                    서비스는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 처리와 관련한
                    이용자의 문의·불만·피해구제 등을 처리하기 위하여 아래와 같이 개인정보 보호책임자를
                    지정하고 있습니다.
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                    <li>· 개인정보 보호책임자: IDIOTQUANT 운영자</li>
                    <li>· 연락처(이메일): <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#16a34a] underline underline-offset-2">{CONTACT_EMAIL}</a></li>
                </ul>
                <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                    개인정보 침해에 관한 상담이 필요한 경우 개인정보분쟁조정위원회(1833-6972),
                    개인정보침해신고센터(118) 등에 문의하실 수 있습니다.
                </p>
            </Section>

            <Section title="제11조 (개인정보 처리방침의 변경)">
                <p>
                    본 개인정보 처리방침은 법령·정책 또는 서비스의 변경에 따라 내용이 추가·삭제·수정될 수
                    있으며, 변경 시 변경 사항을 서비스 화면을 통하여 공지합니다.
                </p>
            </Section>

            <p className="mt-8 pt-6 border-t border-neutral-100 dark:border-[#35332e] text-xs text-neutral-400 dark:text-neutral-500">
                본 방침은 {EFFECTIVE_DATE}부터 시행합니다.
            </p>
        </div>
    );
}

function Section({ title, children, highlight }: { title: string; children: React.ReactNode; highlight?: boolean }) {
    return (
        <section className="mb-7">
            <h2 className={`text-base font-bold mb-2.5 ${highlight ? "text-[#16a34a]" : "text-neutral-900 dark:text-white"}`}>
                {title}
            </h2>
            <div className="text-sm leading-relaxed space-y-2">{children}</div>
        </section>
    );
}

function List({ items }: { items: string[] }) {
    return (
        <ol className="list-decimal pl-5 space-y-1.5 marker:text-neutral-400 dark:marker:text-neutral-500">
            {items.map((item, i) => (
                <li key={i} className="pl-1">{item}</li>
            ))}
        </ol>
    );
}
