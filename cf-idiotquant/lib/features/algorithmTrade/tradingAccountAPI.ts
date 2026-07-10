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
