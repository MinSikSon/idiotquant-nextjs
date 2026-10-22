/** 종목명·거래소 메타데이터는 시세·재무제표 표시의 필수 조건이 아니다. */
export function usAnalysisAvailability(data: {
  usDetail?: { rt_cd?: string; output?: { last?: unknown } };
  finnhubData?: { state?: string; data?: unknown[] };
}) {
  const price = Number(data.usDetail?.output?.last);
  const priceReady = data.usDetail?.rt_cd === '0' && Number.isFinite(price) && price > 0;
  const financialsReady = data.finnhubData?.state === 'fulfilled' &&
    Array.isArray(data.finnhubData.data) && data.finnhubData.data.length > 0;
  return { priceReady, financialsReady };
}
