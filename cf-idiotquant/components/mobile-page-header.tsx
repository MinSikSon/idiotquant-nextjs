"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MobilePageHeaderSlots = {
  searchTarget: HTMLDivElement | null;
  setSearchTarget: (target: HTMLDivElement | null) => void;
  searchLabel: string | null;
  setSearchLabel: (label: string | null) => void;
  scrollTitleTarget: HTMLDivElement | null;
  setScrollTitleTarget: (target: HTMLDivElement | null) => void;
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
  const [searchTarget, setSearchTarget] = useState<HTMLDivElement | null>(null);
  const [searchLabel, setSearchLabel] = useState<string | null>(null);
  const [scrollTitleTarget, setScrollTitleTarget] = useState<HTMLDivElement | null>(null);
  const [tabsTarget, setTabsTarget] = useState<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [titleTarget, setTitleTarget] = useState<HTMLDivElement | null>(null);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ searchTarget, setSearchTarget, searchLabel, setSearchLabel, scrollTitleTarget, setScrollTitleTarget, tabsTarget, setTabsTarget, active, setActive, titleTarget, setTitleTarget, actionsTarget, setActionsTarget }), [searchTarget, searchLabel, scrollTitleTarget, tabsTarget, active, titleTarget, actionsTarget]);
  return <MobilePageHeaderContext.Provider value={value}>{children}</MobilePageHeaderContext.Provider>;
}

export const useMobilePageHeader = () => useContext(MobilePageHeaderContext);
