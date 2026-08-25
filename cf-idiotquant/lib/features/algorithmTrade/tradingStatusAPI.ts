import { apiRequest } from "../apiRequest";

// key(=선택 계정 kakaoId, admin 전용)가 있으면 그 계정 대상으로 조회/토글
export async function fetchTradingStatus(country: "KR" | "US", key?: string): Promise<boolean | null> {
  const q = key ? `&kakao-id=${key}` : "";
  const json = await apiRequest(`/trading/account-status?country=${country}${q}`);

  if (json.status === 404) return false; // 계정 미등록 → OFF 상태로 버튼 표시
  if (!json.success) return null;
  return json.data.is_active as boolean;
}

export async function setTradingActive(country: "KR" | "US", isActive: boolean, key?: string): Promise<boolean> {
  const q = key ? `&kakao-id=${key}` : "";
  const json = await apiRequest(`/trading/account-status?country=${country}${q}`, {
    method: "PATCH",
    body: { is_active: isActive },
  });
  return json.success === true;
}
