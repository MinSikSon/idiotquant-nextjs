"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MobilePageHeaderSlots = {
  infoTarget: HTMLDivElement | null;
  setInfoTarget: (target: HTMLDivElement | null) => void;
  scrollTitleTarget: HTMLDivElement | null;
  setScrollTitleTarget: (target: HTMLDivElement | null) => void;
  active: boolean;
  tabsTarget: HTMLDivElement | null;
  setTabsTarget: (target: HTMLDivElement | null) => void;
  setActive: (active: boolean) => void;
  titleTarget: HTMLDivElement | null;
  setTitleTarget: (target: HTMLDivElement | null) => void;
  primaryActionTarget: HTMLDivElement | null;
  setPrimaryActionTarget: (target: HTMLDivElement | null) => void;
  actionsTarget: HTMLDivElement | null;
  setActionsTarget: (target: HTMLDivElement | null) => void;
};

const MobilePageHeaderContext = createContext<MobilePageHeaderSlots | null>(null);

export function MobilePageHeaderProvider({ children }: { children: ReactNode }) {
  const [infoTarget, setInfoTarget] = useState<HTMLDivElement | null>(null);
  const [scrollTitleTarget, setScrollTitleTarget] = useState<HTMLDivElement | null>(null);
  const [tabsTarget, setTabsTarget] = useState<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [titleTarget, setTitleTarget] = useState<HTMLDivElement | null>(null);
  const [primaryActionTarget, setPrimaryActionTarget] = useState<HTMLDivElement | null>(null);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  const value = useMemo(() => ({
    infoTarget, setInfoTarget,
    scrollTitleTarget, setScrollTitleTarget,
    tabsTarget, setTabsTarget,
    active, setActive,
    titleTarget, setTitleTarget,
    primaryActionTarget, setPrimaryActionTarget,
    actionsTarget, setActionsTarget,
  }), [infoTarget, scrollTitleTarget, tabsTarget, active, titleTarget, primaryActionTarget, actionsTarget]);
  return <MobilePageHeaderContext.Provider value={value}>{children}</MobilePageHeaderContext.Provider>;
}

export const useMobilePageHeader = () => useContext(MobilePageHeaderContext);
