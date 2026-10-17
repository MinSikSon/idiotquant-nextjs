export type NavigationCommand = {
  href: string;
  label: string;
  description?: string;
  keywords?: string;
  shortcut?: string;
};

const DETAILS: Record<string, Omit<NavigationCommand, "href" | "label">> = {
  "/": { description: "오늘의 발굴 종목과 서비스 시작점", keywords: "home 시작" },
  "/screener": { description: "조건을 정해 투자 후보 좁히기", keywords: "screener 필터 per pbr ncav", shortcut: "1" },
  "/compare": { description: "여러 종목의 핵심 지표 나란히 비교", keywords: "compare 비교하기", shortcut: "2" },
  "/analyze": { description: "한 종목의 재무와 가치 자세히 살펴보기", keywords: "analyze analyzer 분석하기 재무", shortcut: "3" },
  "/calculator": { description: "투자 조건에 따른 수익 계산", keywords: "calculator 계산기" },
};

export function navigationCommands(items: { href: string; label: string }[]): NavigationCommand[] {
  return items.map(item => ({ ...item, ...DETAILS[item.href] }));
}

export function searchNavigation(commands: NavigationCommand[], query: string): NavigationCommand[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return commands.filter(command => {
    const text = `${command.label} ${command.description ?? ""} ${command.keywords ?? ""}`.toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  });
}

/** 다른 수정 키 조합이나 한글 조합 중 입력을 페이지 이동으로 해석하지 않는다. */
export function navigationShortcut(commands: NavigationCommand[], event: {
  code: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean;
  shiftKey: boolean; isComposing: boolean; repeat: boolean;
}): NavigationCommand | undefined {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing || event.repeat) return;
  return commands.find(command => command.shortcut && event.code === `Digit${command.shortcut}`);
}
