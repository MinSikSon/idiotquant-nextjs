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

## 3. 이 레포에서의 실제 위치

위 규칙은 **가고자 하는 방향**이고, 아래는 **지금 있는 것**이다. 어긋난 자리는 그때그때
맞춰 가되, 없는 경로를 새로 만들기 전에 이 표를 먼저 본다.

### 경로

이 프로젝트는 Vite 가 아니라 **Next.js 앱 안**이므로 `src/` 가 없다. 위 규칙의 이름을
이 레포의 자리로 옮기면 이렇게 된다.

| 규칙이 말하는 곳 | 이 레포의 자리 | 지금 무엇이 있나 |
|---|---|---|
| `src/core/StockEngine.ts` | `lib/paper/engine.ts` · `lib/paper/localRound.ts` | 체결·수수료·거래세·청산. **테스트가 붙어 있다** |
| `src/core/RoguelikeManager.ts` | (아직 없음) | 카드·유물을 넣을 때 `lib/game/` 아래에 만든다 |
| `src/scenes/TradingScene.ts` | `lib/game/scenes/PlayScene.ts` | Phaser 렌더링·입력 |
| — | `lib/game/{theme,ui,chart,data,boot}.ts` | 색·조각·캔들·데이터·부팅 |
| — | `app/(game)/game/page.tsx` · `GameCanvas.tsx` | 캔버스를 붙이는 React 껍데기 |
| — | `app/(game)/game/classic/` | 예전 React 화면(캠페인·부서·공매도). 참조용 |

**"순수 로직과 Phaser 뷰를 가른다"** 는 규칙은 이미 지켜지고 있다. Scene 은 규칙을
직접 계산하지 않고 `advanceLocal(round, order)` 에 넘기고 돌아온 판을 다시 그릴 뿐이다.
새 규칙을 넣을 때도 **Scene 안에 계산을 쓰지 말고** `lib/paper` 또는 `lib/game` 의 순수
함수로 만든 뒤 부른다 — 그래야 테스트가 붙는다.

### 지금과 다른 것 셋

1. **Vite 가 아니다.** Next.js 15 App Router 안이고, Phaser 는 `/game` 에 들어올 때만
   `dynamic(..., { ssr: false })` 로 내려간다. `vite.config.*` 를 만들지 말 것.
2. **해상도가 390x844 가 아니라 360x640** 이다(`lib/game/theme.ts` 의 `W`·`H`).
   `pixelArt: true`, `Scale.FIT` 는 규칙대로다. 390x844 로 옮기면 390px 폰에서 배율이
   정확히 1.0 이 되어 픽셀 폰트가 더 또렷해지지만, 세로가 204px 늘어 세 Scene 의 배치를
   전부 다시 잡아야 한다. **옮길 때는 세 Scene 을 같이 고칠 것.**
3. **로그라이크가 아직 없다.** 지금은 12턴이 아니라 캔들 41일 한 판이고, 카드도 유물도
   없다. 넣을 때 붙일 자리:
   - 턴 = `advanceLocal` 한 번. 판 길이는 `lib/paper/round.ts` 의 `TOTAL_DAYS`·`CONTEXT_DAYS`
   - 카드 패·유물 발동 = 새 `RoguelikeManager` (순수 함수로)
   - 화면 = `PlayScene` 아래쪽 매매 버튼 자리

### 손대면 안 되는 것

`lib/paper/*` 는 **`/game/classic` 과 워커(idiotquant-worker)가 같이 쓴다.** 여기 규칙을
바꾸면 세 곳이 함께 움직여야 하고, 워커에 같은 규칙의 JS 사본이 있다. 로그라이크용 규칙은
`lib/paper` 를 고치지 말고 `lib/game` 아래에 새로 만들어 얹는다.

### 검증

캔버스는 DOM 셀렉터가 없어 Playwright 가 **좌표로** 누른다. 배치를 바꾸면 테스트가 조용히
어긋나므로, Scene 배치를 고쳤으면 스크린샷으로 눈으로 확인한다.

```
npx tsc --noEmit          # 에러 0
npm test                  # lib/paper 규칙 테스트
npm run build             # /game 라우트가 뜨는지
```
