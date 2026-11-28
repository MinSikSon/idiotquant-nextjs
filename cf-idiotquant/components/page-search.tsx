"use client";

import { useLayoutEffect, useRef } from "react";
import { useStockSearchModal, type PageSearchConfig } from "@/components/stock-search-provider";

/** 페이지의 선택 동작을 등록하고 입력 UI는 공통 모달에서 제공한다. */
export function PageSearch({ label, purpose, disabledMessage, onSelect, market, options, stockNames, requireSelection, disabled = false, guideTrigger }: PageSearchConfig) {
  const { register } = useStockSearchModal();
  const callback = useRef(onSelect);
  useLayoutEffect(() => { callback.current = onSelect; }, [onSelect]);
  useLayoutEffect(() => register({ label, purpose, disabledMessage, market, options, stockNames, requireSelection, disabled, guideTrigger, onSelect: value => callback.current(value) }),
    [register, label, purpose, disabledMessage, market, options, stockNames, requireSelection, disabled, guideTrigger]);

  return null;
}
