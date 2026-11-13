"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MobilePageHeaderSlots = {
  scrollTitleTarget: HTMLDivElement | null;
  setScrollTitleTarget: (target: HTMLDivElement | null) => void;
  searchTarget: HTMLDivElement | null;
  setSearchTarget: (target: HTMLDivElement | null) => void;
  active: boolean;
  tabsTarget: HTMLDivElement | null;
  setTabsTarget: (target: HTMLDivElement | null) => void;
  setActive: (active: boolean) => void;
  titleTarget: HTMLDivElement | null;
  setTitleTarget: (target: HTMLDivElement | null) => void;
  actionsTarget: HTMLDivElement | null;
  setActionsTarget: (target: HTMLDivElement | null) => void;
};

const MobilePageHeaderContext = createContext<MobilePageHeaderSlots | null>(null);

export function MobilePageHeaderProvider({ children }: { children: ReactNode }) {
  const [scrollTitleTarget, setScrollTitleTarget] = useState<HTMLDivElement | null>(null);
  const [searchTarget, setSearchTarget] = useState<HTMLDivElement | null>(null);
  const [tabsTarget, setTabsTarget] = useState<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [titleTarget, setTitleTarget] = useState<HTMLDivElement | null>(null);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ scrollTitleTarget, setScrollTitleTarget, searchTarget, setSearchTarget, tabsTarget, setTabsTarget, active, setActive, titleTarget, setTitleTarget, actionsTarget, setActionsTarget }), [scrollTitleTarget, searchTarget, tabsTarget, active, titleTarget, actionsTarget]);
  return <MobilePageHeaderContext.Provider value={value}>{children}</MobilePageHeaderContext.Provider>;
}

export const useMobilePageHeader = () => useContext(MobilePageHeaderContext);
