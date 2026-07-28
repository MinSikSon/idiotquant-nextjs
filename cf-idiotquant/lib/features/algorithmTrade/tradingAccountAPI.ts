// 자동매매 계정(trading_accounts) 관리 — admin 전용. key = 선택 계정 kakaoId.
export interface TradingAccountInfo {
  exists: boolean;
  country: "KR" | "US";
  user_id: string;
  appkey_masked?: string;
  account_number?: string;
  has_secret?: boolean;
  monthly_budget_krw?: number;
  is_active?: boolean;
}

// 목록 조회 응답 1건 (appsecret 은 서버가 반환하지 않음)
export interface TradingAccountSummary {
  user_id: string;
  appkey_masked: string;
  account_number: string;
  has_secret: boolean;
  monthly_budget_krw: number;
  is_active: boolean;
}

export interface TradingAccountPayload {
  user_id: string;
  appkey?: string;        // 미입력 시 기존 유지
  appsecret?: string;     // 미입력 시 기존 유지
  account_number?: string; // 미입력 시 기존 유지
  monthly_budget_krw?: number;
  is_active?: boolean;
}

export async function fetchTradingAccount(country: "KR" | "US", key: string): Promise<TradingAccountInfo | null> {
  try {
    const res = await fetch(`/api/proxy/trading/account?country=${country}&kakao-id=${encodeURIComponent(key)}`);
    const json = await res.json();
    if (!json.success) return null;
    return json.data as TradingAccountInfo;
  } catch {
    return null;
  }
}

// 등록된 자동매매 계정 목록 (kakao-id 없이 호출). 전체 카카오 회원이 아니라
// trading_accounts 에 실제로 등록된 계정만 돌아온다.
export async function listTradingAccounts(country: "KR" | "US"): Promise<TradingAccountSummary[]> {
  try {
    const res = await fetch(`/api/proxy/trading/account?country=${country}`);
    const json = await res.json();
    if (!json.success) return [];
    return (json.data?.accounts ?? []) as TradingAccountSummary[];
  } catch {
    return [];
  }
}

export async function saveTradingAccount(country: "KR" | "US", payload: TradingAccountPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/proxy/trading/account?country=${country}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, ...payload }),
    });
    const json = await res.json();
    return { ok: json.success === true, error: json.error };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "요청 실패" };
  }
}

export async function deleteTradingAccount(country: "KR" | "US", key: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/proxy/trading/account?country=${country}&kakao-id=${encodeURIComponent(key)}`, { method: "DELETE" });
    const json = await res.json();
    return json.success === true && !!json.data?.deleted;
  } catch {
    return false;
  }
}
