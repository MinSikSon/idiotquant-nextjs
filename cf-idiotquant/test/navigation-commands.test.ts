import { test } from "node:test";
import assert from "node:assert/strict";
import { navigationCommands, navigationShortcut, searchNavigation } from "@/lib/navigationCommands";

const commands = navigationCommands([
  { href: "/screener", label: "종목 발굴" },
  { href: "/compare", label: "종목 비교" },
  { href: "/analyze", label: "종목 분석" },
]);

test("빠른 이동은 메뉴명뿐 아니라 업무·영문명·지표로 찾는다", () => {
  for (const query of ["발굴", " SCREENER ", "per", "투자 후보"]) {
    assert.deepEqual(searchNavigation(commands, query).map(item => item.href), ["/screener"]);
  }
  assert.deepEqual(searchNavigation(commands, "재무").map(item => item.href), ["/analyze"]);
  assert.equal(searchNavigation(commands, "").length, 3);
  assert.equal(searchNavigation(commands, "없는 메뉴").length, 0);
});

test("직접 이동은 Alt와 숫자 조합만 처리하고 조합 입력·키 반복을 무시한다", () => {
  const event = { code: "Digit2", altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, isComposing: false, repeat: false };
  assert.equal(navigationShortcut(commands, event)?.href, "/compare");
  for (const change of [{ altKey: false }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { isComposing: true }, { repeat: true }, { code: "Digit9" }]) {
    assert.equal(navigationShortcut(commands, { ...event, ...change }), undefined);
  }
  // 제공받은 메뉴 밖의 경로를 단축키로 노출하지 않는다.
  assert.equal(navigationShortcut(commands.filter(item => item.href !== "/compare"), event), undefined);
});
