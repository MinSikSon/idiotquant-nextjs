import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

// 비활성 백테스트의 기존 주소는 발굴 화면으로 연결한다.
export default function BacktestPage() {
    redirect('/screener');
}
