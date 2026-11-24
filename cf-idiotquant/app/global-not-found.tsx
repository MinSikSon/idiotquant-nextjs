import type { Metadata } from 'next';
import Link from 'next/link';
import './global.css';

export const metadata: Metadata = { title: '페이지를 찾을 수 없습니다 | IdiotQuant' };

export default function GlobalNotFound() {
    return (
        <html lang="ko">
            <body>
                <main className="mx-auto max-w-xl px-6 py-16">
                    <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
                    <Link href="/" className="mt-4 inline-block underline underline-offset-4">홈으로 돌아가기</Link>
                </main>
            </body>
        </html>
    );
}
