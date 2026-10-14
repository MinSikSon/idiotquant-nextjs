import Link from 'next/link';
import { faqSchema, type FaqItem } from '@/lib/seo-content';

// 클라이언트 도구가 로딩 중이어도 설명과 답변은 서버 HTML에 포함한다.
export default function PageAnswers({ title, path, items }: {
  title: string; path: string; items: readonly FaqItem[];
}) {
  return (
    <section aria-label={`${title} 도움말`} className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h2 className="text-lg font-semibold tracking-tight">{title} 자주 묻는 질문</h2>
      <div className="mt-5 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {items.map(({ q, a }) => (
          <details key={q} className="group py-4">
            <summary className="cursor-pointer list-none text-sm font-medium">{q}<span aria-hidden="true" className="float-right ml-3 text-brand-ink group-open:rotate-45">＋</span></summary>
            <p className="mt-3 text-sm leading-7 text-neutral-600 dark:text-neutral-300">{a}</p>
          </details>
        ))}
      </div>
      <nav aria-label="관련 도구" className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-brand-ink">
        {[
          ['/quant', '퀀트 투자 안내'], ['/screener', '종목 발굴'],
          ['/compare', '종목 비교'], ['/analyze', '주식 분석'], ['/calculator', '복리 계산기'],
        ].filter(([href]) => href !== path).map(([href, label]) => (
          <Link key={href} href={href} className="hover:underline">{label}</Link>
        ))}
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(items, path)).replace(/</g, '\\u003c') }} />
    </section>
  );
}
