# Stock Roguelike (Phaser 4 + Vite + TS) Project Rules

## 1. Environment & Architecture
- Framework: Phaser 4 (or latest Phaser 3.8x with Render Nodes), Vite, TypeScript.
- Screen Resolution: Portrait 390x844 (FIT scale, pixelArt: true).
- Loop Design: 12 Turns per Run (3-5 min session), Deckbuilding strategy cards + passive relics.

## 2. Coding Guidelines
- Separate Pure Engine Logic from Phaser View:
  - `src/core/StockEngine.ts`: Deterministic stock price tick, portfolio balance.
  - `src/core/RoguelikeManager.ts`: Card hand generation, relic triggers.
  - `src/scenes/TradingScene.ts`: Phaser rendering, touch handlers, animations.

---

## 3. 지켜야 할 선

**`src/core` 는 Phaser 를 import 하지 않는다.** 이 한 줄이 위 규칙의 전부다. 코어가
화면을 모르면 화면 없이 돌려 볼 수 있고, 씬을 갈아 끼워도 규칙이 안 흔들린다.
`TradingScene` 에 `price * 1.1` 같은 식이 생기면 그건 코어로 가야 할 것이 샌 것이다.

**카드를 더할 때 엔진을 고치지 않는다.** 카드 효과는 `RoguelikeManager` 의 `CARD_POOL`
안에서 `TurnBuff` 를 주무르고, 엔진은 그 덩어리 하나만 받는다. 새 효과가 필요하면
`types.ts` 의 `TurnBuff` 에 필드를 **하나 더할** 뿐이고 함수 모양은 그대로다.

**시드 하나가 판 전체를 정한다.** `Math.random()` 을 코어 안에서 직접 부르지 말 것 —
같은 판을 두 번 볼 수 없게 되고, 무엇이 이상했는지 되짚을 수도 없다.

## 4. 알아 둘 것

- **Vite 8 은 rolldown 이다.** `manualChunks` 가 객체를 안 받고 함수만 받는다.
- **`Phaser.GameObjects.Container` 를 상속할 때 `w` · `h` · `body` 를 쓰지 말 것.**
  부모가 이미 갖고 있어 덮어쓰면 컨테이너가 망가진다(`boxW` · `boxH` · `plot` 로 둔다).
- 캔버스는 스크린리더에 빈 사각형이다. 접근성이 필요해지면 캔버스 뒤에 숨은 DOM
  컨트롤을 따로 깔아야 한다 — 지금은 없다.
- 화면 검증은 좌표를 눌러야 한다(DOM 셀렉터가 없다). 배치를 바꾸면 테스트가 조용히
  어긋나므로 스크린샷으로 눈으로 확인한다.

## 5. 명령

```
npm run dev         # 5173, host 열림 (같은 망의 폰에서 열어 볼 수 있다)
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + vite build
npm run preview     # 빌드 결과를 그대로 띄운다
```
