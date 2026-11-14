"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { StockSearchModal } from "@/components/stock-search-modal";

import type { StockSearchName } from "@/lib/utils/stockSuggestions";

export type PageSearchConfig = {
  label?: string;
  market?: "KR" | "US";
  options?: string[];
  stockNames?: StockSearchName[];
  requireSelection?: boolean;
  disabled?: boolean;
  onSelect: (value: string) => void | Promise<void>;
};

type SearchContext = {
  register: (config: PageSearchConfig) => () => void;
  openSearch: () => void;
  label: string;
  open: boolean;
};
const Context = createContext<SearchContext | null>(null);

export function useStockSearchModal() {
  const context = useContext(Context);
  if (!context) throw new Error("StockSearchProvider가 필요합니다.");
  return context;
}

export function StockSearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [config, setConfig] = useState<PageSearchConfig | null>(null);
  const [state, setState] = useState({ pathname, open: false });
  if (state.pathname !== pathname) setState({ pathname, open: false });
  const open = state.pathname === pathname && state.open;
  const trigger = useRef<HTMLElement | null>(null);
  const register = useCallback((value: PageSearchConfig) => {
    setConfig(value);
    return () => setConfig(current => current === value ? null : current);
  }, []);
  const openSearch = useCallback(() => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // 클릭 안에서 렌더링하고 포커스해야 iOS에서도 키보드가 열린다.
    flushSync(() => setState({ pathname, open: true }));
  }, [pathname]);
  const close = useCallback(() => setState({ pathname, open: false }), [pathname]);

  const select = (value: string) => {
    if (config?.disabled) return;
    flushSync(() => setState({ pathname, open: false }));
    if (config) void config.onSelect(value);
    else router.push(`/analyze?ticker=${encodeURIComponent(value)}`);
  };
  const label = config?.label ?? "종목 검색";
  const context = useMemo(() => ({ register, openSearch, label, open }),
    [register, openSearch, label, open]);
  return <Context.Provider value={context}>
    {children}
    <StockSearchModal open={open} label={label} market={config?.market} options={config?.options} stockNames={config?.stockNames} requireSelection={config?.requireSelection}
      disabled={config?.disabled} onSelect={select} onClose={close} trigger={trigger} />
  </Context.Provider>;
}

export function StockSearchTrigger() {
  const { openSearch, label, open } = useStockSearchModal();
  return <button type="button" data-page-search-trigger data-page-input-trigger aria-label={label}
    aria-haspopup="dialog" aria-controls="stock-search-modal" aria-expanded={open}
    onClick={openSearch} className="navigation-icon"><Search size={21} /></button>;
}
