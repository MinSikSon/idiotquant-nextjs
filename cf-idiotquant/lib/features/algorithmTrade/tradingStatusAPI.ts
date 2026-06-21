// key(=선택 계정 kakaoId, admin 전용)가 있으면 그 계정 대상으로 조회/토글
export async function fetchTradingStatus(country: "KR" | "US", key?: string): Promise<boolean | null> {
  try {
    const q = key ? `&kakao-id=${key}` : "";
    const res = await fetch(`/api/proxy/trading/account-status?country=${country}${q}`);
    if (res.status === 404) return false; // 계정 미등록 → OFF 상태로 버튼 표시
    const json = await res.json();
    if (!json.success) return null;
    return json.data.is_active as boolean;
  } catch {
    return null;
  }
}

export async function setTradingActive(country: "KR" | "US", isActive: boolean, key?: string): Promise<boolean> {
  const q = key ? `&kakao-id=${key}` : "";
  const res = await fetch(`/api/proxy/trading/account-status?country=${country}${q}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: isActive }),
  });
  const json = await res.json();
  return json.success === true;
}
