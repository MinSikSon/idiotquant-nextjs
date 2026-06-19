import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "이용약관",
    robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = "2026년 6월 19일";

export default function TermsPage() {
    return (
        <div className="text-neutral-700 dark:text-neutral-300">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-1.5">이용약관</h1>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-8">시행일: {EFFECTIVE_DATE}</p>

            <Section title="제1조 (목적)">
                <p>
                    본 약관은 IDIOTQUANT(이하 “서비스”)가 제공하는 주식 종목 발굴·재무분석·백테스트 등
                    일체의 서비스 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한
                    사항을 규정하는 것을 목적으로 합니다.
                </p>
            </Section>

            <Section title="제2조 (정의)">
                <List items={[
                    "“서비스”란 이용자가 단말기를 통하여 이용할 수 있도록 IDIOTQUANT가 제공하는 종목 스크리닝, 재무분석, 적정주가 계산, 백테스트 등의 제반 서비스를 의미합니다.",
                    "“이용자”란 본 약관에 동의하고 서비스를 이용하는 회원 및 비회원을 말합니다.",
                    "“회원”이란 카카오 계정 등을 통해 로그인하여 서비스를 이용하는 자를 말합니다.",
                ]} />
            </Section>

            <Section title="제3조 (약관의 효력 및 변경)">
                <List items={[
                    "본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.",
                    "서비스는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 약관을 개정할 경우 적용일자 및 개정사유를 명시하여 적용일자 7일 전부터 공지합니다.",
                    "이용자가 개정 약관의 적용에 동의하지 않는 경우 서비스 이용을 중단하고 회원 탈퇴를 할 수 있습니다. 개정 약관의 효력 발생일 이후에도 서비스를 계속 이용하는 경우 약관의 변경에 동의한 것으로 봅니다.",
                ]} />
            </Section>

            <Section title="제4조 (서비스의 제공 및 변경)">
                <List items={[
                    "서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.",
                    "서비스는 운영상·기술상의 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경할 수 있으며, 변경 내용은 사전에 공지합니다.",
                    "서비스가 제공하는 데이터는 외부 시세·재무 데이터 제공처로부터 수집되며, 데이터의 정확성·완전성·적시성을 보장하지 않습니다.",
                ]} />
            </Section>

            <Section title="제5조 (서비스 이용계약의 성립)">
                <List items={[
                    "이용계약은 이용자가 본 약관에 동의하고 카카오 계정 등을 통해 로그인함으로써 성립합니다.",
                    "서비스는 회원가입 시 카카오 계정으로부터 제공받는 프로필 정보(이름, 이메일 등)를 회원 식별 및 서비스 제공 목적으로 이용합니다.",
                ]} />
            </Section>

            <Section title="제6조 (이용자의 의무)">
                <List items={[
                    "이용자는 본 약관 및 관련 법령, 서비스가 공지하는 사항을 준수하여야 합니다.",
                    "이용자는 타인의 정보를 도용하거나, 서비스의 정상적인 운영을 방해하는 행위, 서비스가 제공하는 정보를 무단으로 복제·배포·상업적으로 이용하는 행위를 하여서는 안 됩니다.",
                    "이용자는 자신의 계정 및 로그인 정보를 관리할 책임이 있으며, 이를 제3자가 이용하도록 하여서는 안 됩니다.",
                ]} />
            </Section>

            <Section title="제7조 (투자 정보에 관한 책임의 제한)" highlight>
                <List items={[
                    "서비스가 제공하는 종목 발굴 결과, 재무지표, 적정주가, 백테스트 결과 등 일체의 정보는 투자 참고용 자료일 뿐이며, 특정 종목의 매수·매도를 권유하거나 투자수익을 보장하는 것이 아닙니다.",
                    "서비스는 투자자문업·투자일임업 등 자본시장과 금융투자업에 관한 법률상의 금융투자업자가 아니며, 제공되는 정보는 투자자문에 해당하지 않습니다.",
                    "모든 투자에 관한 최종 판단과 책임은 이용자 본인에게 있으며, 서비스가 제공한 정보를 근거로 한 투자 결과(손실 포함)에 대하여 서비스는 어떠한 책임도 부담하지 않습니다.",
                ]} />
            </Section>

            <Section title="제8조 (서비스 이용의 제한 및 중단)">
                <List items={[
                    "서비스는 설비의 보수·점검, 통신두절, 천재지변 등 부득이한 사유가 발생한 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.",
                    "이용자가 본 약관을 위반한 경우 서비스는 사전 통지 후 서비스 이용을 제한하거나 이용계약을 해지할 수 있습니다.",
                ]} />
            </Section>

            <Section title="제9조 (회원 탈퇴 및 자격 상실)">
                <List items={[
                    "회원은 언제든지 서비스 내 ‘회원 탈퇴’ 기능을 통해 이용계약을 해지할 수 있으며, 탈퇴 시 회원의 개인정보는 개인정보 처리방침에 따라 파기됩니다.",
                    "서비스의 안정적 운영을 위하여 탈퇴 후 일정 기간 동안 동일 계정으로의 재가입이 제한될 수 있습니다.",
                ]} />
            </Section>

            <Section title="제10조 (면책조항)">
                <List items={[
                    "서비스는 천재지변, 외부 데이터 제공처의 장애, 통신서비스 장애 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임이 면제됩니다.",
                    "서비스는 무료로 제공되는 서비스의 이용과 관련하여 관련 법령에 특별한 규정이 없는 한 이용자에게 발생한 손해에 대하여 책임을 지지 않습니다.",
                ]} />
            </Section>

            <Section title="제11조 (준거법 및 관할법원)">
                <p>
                    본 약관은 대한민국 법령에 따라 규율되며, 서비스 이용과 관련하여 서비스와 이용자 간에
                    분쟁이 발생한 경우 관할법원은 민사소송법에 따른 법원으로 합니다.
                </p>
            </Section>

            <p className="mt-8 pt-6 border-t border-neutral-100 dark:border-[#35332e] text-xs text-neutral-400 dark:text-neutral-500">
                부칙: 본 약관은 {EFFECTIVE_DATE}부터 시행합니다.
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
