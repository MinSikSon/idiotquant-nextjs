export interface TickerRow {
  ticker: string;
  name: string;
  country: string;
  source: "hardcoded" | "override";
  has_override: boolean;
  created_at?: string;
}

export interface TickerMapMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export async function fetchTickerMap(params: {
  country?: string;
  q?: string;
  page?: number;
  limit?: number;
  source?: "all" | "hardcoded" | "overrides";
}): Promise<{ data: TickerRow[]; meta: TickerMapMeta }> {
  const sp = new URLSearchParams();
  if (params.country) sp.set("country", params.country);
  if (params.q) sp.set("q", params.q);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.source) sp.set("source", params.source);

  const res = await fetch(`/api/proxy/ticker-map?${sp.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "불러오기 실패");
  return { data: json.data, meta: json.meta };
}

export async function upsertTickerMap(ticker: string, name: string, country = "KR"): Promise<TickerRow> {
  const res = await fetch("/api/proxy/ticker-map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, name, country }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "저장 실패");
  return json.data;
}

export async function deleteTickerMap(ticker: string): Promise<void> {
  const res = await fetch(`/api/proxy/ticker-map/${encodeURIComponent(ticker)}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "삭제 실패");
}
