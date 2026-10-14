export function historicalPrice(result: any, market: 'KR' | 'US', end: string) {
  if (result?.rt_cd !== '0') throw new Error('해당 날짜의 시세를 불러오지 못했습니다.');
  const dateKey = market === 'KR' ? 'stck_bsop_date' : 'xymd';
  const priceKey = market === 'KR' ? 'stck_clpr' : 'clos';
  const row = (Array.isArray(result.output2) ? result.output2 : [])
    .filter((item: any) => /^\d{8}$/.test(item?.[dateKey]) && item[dateKey] <= end)
    .sort((a: any, b: any) => b[dateKey].localeCompare(a[dateKey]))[0];
  const price = Number(row?.[priceKey]);
  if (!Number.isFinite(price) || price <= 0) throw new Error('선택한 날짜 이전의 거래 가격이 없습니다.');
  return { price, priceDate: row[dateKey] as string };
}
