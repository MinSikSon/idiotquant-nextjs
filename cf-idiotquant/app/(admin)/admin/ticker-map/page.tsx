"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search, Plus, Trash2, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight, Edit3, Check, X, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchTickerMap, upsertTickerMap, deleteTickerMap,
  type TickerRow, type TickerMapMeta,
} from "@/lib/features/algorithmTrade/tickerMapAPI";

const COUNTRY_OPTIONS = [
  { value: "KR", label: "국내(KR)" },
  { value: "US", label: "미국(US)" },
  { value: "all", label: "전체" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "hardcoded", label: "기본 목록" },
  { value: "overrides", label: "오버라이드만" },
];

export default function TickerMapPage() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [rows, setRows] = useState<TickerRow[]>([]);
  const [meta, setMeta] = useState<TickerMapMeta>({ total: 0, page: 1, limit: 50, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [country, setCountry] = useState("KR");
  const [source, setSource] = useState<"all" | "hardcoded" | "overrides">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addTicker, setAddTicker] = useState("");
  const [addName, setAddName] = useState("");
  const [addCountry, setAddCountry] = useState("KR");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deletingTicker, setDeletingTicker] = useState<string | null>(null);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTickerMap({ country, q: q || undefined, page: p, limit: 50, source });
      setRows(result.data);
      setMeta(result.meta);
      setPage(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [country, q, source, page]);

  useEffect(() => {
    if (status === "loading") return;
    load(1);
  }, [country, source, status]);

  const handleSearch = (val: string) => {
    setQ(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1), 400);
  };

  const handleAdd = async () => {
    if (!addTicker.trim() || !addName.trim()) {
      setAddError("티커와 종목명을 모두 입력하세요.");
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      await upsertTickerMap(addTicker.trim().toUpperCase(), addName.trim(), addCountry);
      setAddTicker("");
      setAddName("");
      setShowAddForm(false);
      load(page);
    } catch (e: any) {
      setAddError(e.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditSave = async (ticker: string) => {
    if (!editName.trim()) return;
    setEditLoading(true);
    try {
      const row = rows.find(r => r.ticker === ticker);
      await upsertTickerMap(ticker, editName.trim(), row?.country ?? "KR");
      setEditingTicker(null);
      load(page);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (ticker: string) => {
    try {
      await deleteTickerMap(ticker);
      setDeletingTicker(null);
      load(page);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-[60vh] text-sm text-neutral-400">권한 확인 중…</div>;
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-5">

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">종목명 매핑 관리</h1>
            <p className="text-sm text-neutral-400 mt-1">티커 코드 ↔ 종목명 오버라이드 조회 및 관리</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setShowAddForm(v => !v); setAddError(null); }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#16a34a] text-white rounded-xl text-xs font-black hover:bg-[#15803d] transition-colors"
            >
              <Plus size={14} /> 오버라이드 추가
            </button>
          )}
        </div>

        {isAdmin && showAddForm && (
          <div className="bg-white dark:bg-[#242320] border border-[#16a34a]/30 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-neutral-500 uppercase tracking-wider">새 오버라이드 추가</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={addTicker}
                onChange={e => setAddTicker(e.target.value.toUpperCase())}
                placeholder="티커 (예: 005930, AAPL)"
                className="flex-1 min-w-[120px] px-3 py-2 bg-[#faf9f7] dark:bg-[#1a1915] border border-neutral-200 dark:border-[#35332e] rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#16a34a] dark:text-white"
              />
              <input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="종목명 (예: 삼성전자)"
                className="flex-1 min-w-[160px] px-3 py-2 bg-[#faf9f7] dark:bg-[#1a1915] border border-neutral-200 dark:border-[#35332e] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] dark:text-white"
              />
              <select
                value={addCountry}
                onChange={e => setAddCountry(e.target.value)}
                className="px-3 py-2 bg-[#faf9f7] dark:bg-[#1a1915] border border-neutral-200 dark:border-[#35332e] rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#16a34a] dark:text-white"
              >
                <option value="KR">국내(KR)</option>
                <option value="US">미국(US)</option>
              </select>
              <button
                onClick={handleAdd}
                disabled={addLoading}
                className="flex items-center gap-1 px-3 py-2 bg-[#16a34a] text-white rounded-xl text-xs font-black hover:bg-[#15803d] disabled:opacity-50 transition-colors"
              >
                {addLoading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} 저장
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddError(null); }}
                className="px-3 py-2 bg-neutral-100 dark:bg-[#35332e] text-neutral-500 rounded-xl text-xs font-black hover:bg-neutral-200 dark:hover:bg-[#4a4641] transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            {addError && <p className="text-xs text-rose-500 font-bold">{addError}</p>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex rounded-xl border border-neutral-200 dark:border-[#35332e] overflow-hidden">
            {COUNTRY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setCountry(opt.value); setPage(1); }}
                className={cn(
                  "px-3 py-1.5 text-xs font-black transition-colors",
                  country === opt.value
                    ? "bg-[#16a34a] text-white"
                    : "bg-white dark:bg-[#242320] text-neutral-500 hover:bg-neutral-50 dark:hover:bg-[#35332e]"
                )}
              >{opt.label}</button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <Filter size={11} />
            {SOURCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setSource(opt.value as any); setPage(1); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-colors",
                  source === opt.value
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                    : "bg-neutral-100 dark:bg-[#35332e] text-neutral-500 hover:bg-neutral-200 dark:hover:bg-[#4a4641]"
                )}
              >{opt.label}</button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-[180px] max-w-[300px] bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] rounded-xl px-3 py-1.5">
            <Search size={12} className="text-neutral-400 shrink-0" />
            <input
              value={q}
              onChange={e => handleSearch(e.target.value)}
              placeholder="티커 또는 종목명 검색..."
              className="flex-1 text-xs bg-transparent focus:outline-none dark:text-white placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
            />
            {q && <button onClick={() => { setQ(""); load(1); }} className="text-neutral-400 hover:text-neutral-600"><X size={11} /></button>}
          </div>

          <button
            onClick={() => load(page)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-neutral-100 dark:bg-[#35332e] text-neutral-500 hover:bg-neutral-200 dark:hover:bg-[#4a4641] transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>

          <span className="text-[10px] font-mono text-neutral-400 ml-auto">
            총 {meta.total.toLocaleString()}개
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-[#35332e]">
                  <th className="px-4 py-3 text-left text-[10px] font-black text-neutral-400 uppercase tracking-widest">티커</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-neutral-400 uppercase tracking-widest">종목명</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-neutral-400 uppercase tracking-widest">국가</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-neutral-400 uppercase tracking-widest">소스</th>
                  {isAdmin && <th className="px-4 py-3 text-center text-[10px] font-black text-neutral-400 uppercase tracking-widest">액션</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-[#35332e]/40">
                {loading && rows.length === 0 && (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-xs text-neutral-400">불러오는 중...</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-xs text-neutral-400">결과 없음</td></tr>
                )}
                {rows.map(row => (
                  <tr key={row.ticker} className="hover:bg-[#f5f0e8] dark:hover:bg-[#2a2825] transition-colors group">
                    <td className="px-4 py-3">
                      <span className="font-mono font-black text-xs text-neutral-900 dark:text-white">{row.ticker}</span>
                    </td>
                    <td className="px-4 py-3">
                      {editingTicker === row.ticker ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleEditSave(row.ticker); if (e.key === "Escape") setEditingTicker(null); }}
                            className="flex-1 px-2 py-1 text-xs border border-[#16a34a] rounded-lg bg-[#faf9f7] dark:bg-[#1a1915] focus:outline-none dark:text-white"
                          />
                          <button onClick={() => handleEditSave(row.ticker)} disabled={editLoading} className="p-1 text-[#16a34a] hover:bg-[#f0fdf4] rounded-lg">
                            {editLoading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                          </button>
                          <button onClick={() => setEditingTicker(null)} className="p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#35332e] rounded-lg">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-700 dark:text-neutral-200">{row.name}</span>
                          {row.has_override && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full font-black">오버라이드</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full",
                        row.country === "KR"
                          ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                          : "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
                      )}>{row.country}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full",
                        row.source === "hardcoded"
                          ? "bg-neutral-100 dark:bg-[#35332e] text-neutral-500"
                          : "bg-[#dcfce7] dark:bg-[#052e16]/30 text-[#16a34a]"
                      )}>{row.source === "hardcoded" ? "기본" : "오버라이드"}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingTicker !== row.ticker && (
                            <button
                              onClick={() => { setEditingTicker(row.ticker); setEditName(row.name); }}
                              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#35332e] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                              title="이름 수정 (오버라이드 저장)"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          {row.has_override && (
                            deletingTicker === row.ticker ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(row.ticker)}
                                  className="px-2 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-black hover:bg-rose-600 transition-colors"
                                >확인</button>
                                <button
                                  onClick={() => setDeletingTicker(null)}
                                  className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-[#35332e] text-neutral-500 text-[10px] font-black"
                                >취소</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingTicker(row.ticker)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-neutral-400 hover:text-rose-500 transition-colors"
                                title="오버라이드 삭제"
                              >
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 dark:border-[#35332e]">
              <span className="text-[11px] text-neutral-400 font-mono">
                {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} / {meta.total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => load(meta.page - 1)}
                  disabled={meta.page <= 1 || loading}
                  className="p-1.5 rounded-lg bg-neutral-100 dark:bg-[#35332e] text-neutral-500 disabled:opacity-40 hover:bg-neutral-200 dark:hover:bg-[#4a4641] transition-colors"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[11px] font-mono text-neutral-500 px-2">
                  {meta.page} / {meta.pages}
                </span>
                <button
                  onClick={() => load(meta.page + 1)}
                  disabled={meta.page >= meta.pages || loading}
                  className="p-1.5 rounded-lg bg-neutral-100 dark:bg-[#35332e] text-neutral-500 disabled:opacity-40 hover:bg-neutral-200 dark:hover:bg-[#4a4641] transition-colors"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
