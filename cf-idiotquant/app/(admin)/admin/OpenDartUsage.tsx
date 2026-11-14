"use client";

import { useEffect, useState } from "react";

interface Usage {
  checkedAt: number;
  apiKeyConfigured: boolean;
  limit: number;
  used: number;
  remaining: number;
  windowStart: number;
  today: number;
  hourly: { start: number; calls: number }[];
}
const time = (value: number) => new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

export default function OpenDartUsage() {
  const [data, setData] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/proxy/admin/opendart/usage", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error ?? "사용량 조회에 실패했습니다.");
        if (!controller.signal.aborted) setData(body.data);
      })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "사용량 조회에 실패했습니다."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  return (
    <section aria-label="OpenDART API 사용량" className="mb-6 rounded-xl border border-neutral-200/70 bg-white p-5 dark:border-surface-dark-border dark:bg-surface-dark">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">OpenDART API 사용량</h2>
        <button type="button" onClick={() => { setLoading(true); setError(null); setRefresh(value => value + 1); }} disabled={loading} className="min-h-11 rounded-lg border border-neutral-200 px-3 text-xs disabled:opacity-50 dark:border-border-subtle-dark">
          {loading ? "조회 중…" : "새로고침"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
      {data && <>
        <p className="mt-2 text-xs text-neutral-500">API 키 {data.apiKeyConfigured ? "등록됨" : "미등록"} · {time(data.checkedAt)} KST 기준</p>
        <dl className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["오늘 (KST)", data.today], ["제한 집계 호출", data.used], ["서비스 호출 한도", data.limit], ["남은 호출", data.remaining]].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-neutral-50 p-3 dark:bg-surface-dark-card">
              <dt className="text-xs text-neutral-500">{label}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{Number(value).toLocaleString("ko-KR")}<span className="ml-1 text-xs font-normal">회</span></dd>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-relaxed text-neutral-500">스캔·종목 조회·기업코드 갱신 등 이 서비스의 외부 호출 예약 수입니다. 실패한 요청은 포함하고 캐시 조회는 제외합니다. 같은 키를 쓰는 다른 서비스의 호출은 포함하지 않습니다.</p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">한도는 최근 24시간을 모두 포함하도록 현재 시간대와 직전 24개 시간대를 합산합니다. 자정에 초기화되지 않습니다. 집계 시작: {time(data.windowStart)} KST.</p>
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer py-2">시간별 호출 내역 (KST)</summary>
          {data.hourly.length ? <div className="max-h-60 overflow-auto"><table className="w-full text-left"><thead><tr><th className="py-2 font-normal">시간대 시작</th><th className="py-2 text-right font-normal">호출 수</th></tr></thead><tbody>
            {data.hourly.map(row => <tr key={row.start} className="border-t border-neutral-100 dark:border-border-subtle-dark"><td className="py-2">{time(row.start)}</td><td className="py-2 text-right tabular-nums">{row.calls.toLocaleString("ko-KR")}회</td></tr>)}
          </tbody></table></div> : <p className="py-2 text-neutral-500">집계 기간 내 호출 기록이 없습니다.</p>}
        </details>
      </>}
    </section>
  );
}
