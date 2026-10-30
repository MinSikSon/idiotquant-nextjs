"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MobilePageHeaderSlots = {
  active: boolean;
  desktopTitleTarget: HTMLDivElement | null;
  setDesktopTitleTarget: (target: HTMLDivElement | null) => void;
  desktopActionsTarget: HTMLDivElement | null;
  setDesktopActionsTarget: (target: HTMLDivElement | null) => void;
  setActive: (active: boolean) => void;
  titleTarget: HTMLDivElement | null;
  setTitleTarget: (target: HTMLDivElement | null) => void;
  actionsTarget: HTMLDivElement | null;
  setActionsTarget: (target: HTMLDivElement | null) => void;
};

const MobilePageHeaderContext = createContext<MobilePageHeaderSlots | null>(null);

export function MobilePageHeaderProvider({ children }: { children: ReactNode }) {
  const [desktopTitleTarget, setDesktopTitleTarget] = useState<HTMLDivElement | null>(null);
  const [desktopActionsTarget, setDesktopActionsTarget] = useState<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [titleTarget, setTitleTarget] = useState<HTMLDivElement | null>(null);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ desktopTitleTarget, setDesktopTitleTarget, desktopActionsTarget, setDesktopActionsTarget, active, setActive, titleTarget, setTitleTarget, actionsTarget, setActionsTarget }), [active, titleTarget, actionsTarget, desktopTitleTarget, desktopActionsTarget]);
  return <MobilePageHeaderContext.Provider value={value}>{children}</MobilePageHeaderContext.Provider>;
}

export const useMobilePageHeader = () => useContext(MobilePageHeaderContext);
