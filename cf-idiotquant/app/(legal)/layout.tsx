import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] px-4 py-10 md:py-16">
            <div className="mx-auto max-w-2xl">

                {/* Brand */}
                <div className="flex justify-center mb-8">
                    <Link href="/" className="group flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#16a34a] rounded-2xl flex items-center justify-center shadow-sm shadow-[#16a34a]/20">
                            <span className="text-white text-[12px] font-black italic leading-none">IQ</span>
                        </div>
                        <span className="font-black tracking-tighter text-lg text-neutral-900 dark:text-white">
                            IDIOT<span className="text-[#16a34a]">QUANT</span>
                        </span>
                    </Link>
                </div>

                <article className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200/70 dark:border-[#35332e] shadow-sm px-6 py-8 md:px-10 md:py-10">
                    {children}
                </article>

                {/* Footer nav */}
                <div className="mt-6 flex justify-center gap-5 text-[12px] text-neutral-400 dark:text-neutral-500">
                    <Link href="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">이용약관</Link>
                    <span className="text-neutral-200 dark:text-neutral-700">·</span>
                    <Link href="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">개인정보 처리방침</Link>
                    <span className="text-neutral-200 dark:text-neutral-700">·</span>
                    <Link href="/login" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">로그인으로</Link>
                </div>
            </div>
        </div>
    );
}
