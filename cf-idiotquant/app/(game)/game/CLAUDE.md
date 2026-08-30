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
| `src/core/StockEngine.ts` | `lib/game/core/StockEngine.ts` | 12턴 주가 틱·체결·수수료. **Phaser 를 모른다** |
| `src/core/RoguelikeManager.ts` | `lib/game/core/RoguelikeManager.ts` | 덱·손패·보상·저주·유물. 여기도 Phaser 를 모른다 |
| `src/scenes/TradingScene.ts` | `lib/game/scenes/TradingScene.ts` | Phaser 렌더링·입력·오버레이 |
| — | `lib/game/core/{types,progress}.ts` | 값의 모양 / 판을 넘어 남는 것(localStorage) |
| — | `lib/game/components/{PixelCandleChart,CardHandContainer}.ts` | 차트·손패 |
| — | `lib/game/{config.ts,ui/theme.ts}` | 부팅 설정 / 색·치수·글꼴 |
| — | `app/(game)/game/page.tsx` · `PhaserGame.tsx` | 캔버스를 붙이는 React 껍데기 |
| — | `app/(game)/game/cards/page.tsx` | 도감. **코어 정의를 그대로 그린다** — 값을 다시 적지 말 것 |
| — | `lib/paper/*` · `lib/game/{theme,ui,chart,data,boot}.ts` | **다른 게임**(블라인드 차트 `/game/blind`). 헷갈리지 말 것 |
| — | `app/(game)/game/classic/` | 예전 React 화면(캠페인·부서·공매도). 참조용 |

**"순수 로직과 Phaser 뷰를 가른다"** 는 규칙은 이미 지켜지고 있다. Scene 은 규칙을
직접 계산하지 않고 `advanceLocal(round, order)` 에 넘기고 돌아온 판을 다시 그릴 뿐이다.
새 규칙을 넣을 때도 **Scene 안에 계산을 쓰지 말고** `lib/paper` 또는 `lib/game` 의 순수
함수로 만든 뒤 부른다 — 그래야 테스트가 붙는다.

### 지금과 다른 것들

1. **Vite 가 아니다.** Next.js 15 App Router 안이고, Phaser 는 `/game` 에 들어올 때만
   `dynamic(..., { ssr: false })` 로 내려간다. `vite.config.*` 를 만들지 말 것.
2. **게임이 둘이다.** `/game` 이 이 규칙이 말하는 12턴 로그라이크(`lib/game/core`·
   `lib/game/ui/theme.ts`)이고, 블라인드 차트는 `/game/blind` 로 내려갔다(360x640,
   `lib/game/theme.ts`·`lib/paper`). 파일 이름이 비슷하니 고치기 전에 어느 쪽인지 확인할 것.
3. **시장에 숨은 국면이 있다 — 이 게임의 심장이다.**
   상승·하락·횡보가 3~5턴씩 이어지다 바뀐다(`StockEngine.buildPlan`). 이것이 없으면
   차트가 장식이고 실력이 0이다 — 실제로 그랬다(오른 턴 다음 상승 확률 51.6%, 추세 추종
   +0.2% vs 동전 −0.4%). 지금은 62.6% / +24% vs −1%.
   - **판의 등락은 시드에서 통째로 미리 정해진다**(`plan`). 그래야 예보 카드가 없던
     미래를 만드는 것이 아니라 이미 정해진 것을 앞당겨 보는 것이 된다. 정보가 값어치를
     갖는 유일한 방법이다.
   - **카드는 주가를 밀지 않는다.** `priceBias` 같은 필드를 되살리지 말 것(테스트가 막는다).
     카드가 바꾸는 것은 시장이 아니라 나다 — 정보(무엇을 보는가) · 집행(무엇을 할 수
     있는가) · 방어(얼마나 맞는가).
   - 엔진이 아는 것을 화면에 그대로 주면 게임이 없다. 화면은 `engine.read(buff)` 가
     내준 것만 그린다.
   - 예보는 뉴스 줄이 아니라 **차트 위 유령 봉**으로 그린다. 뉴스 줄은 매매 한 번에
     덮이는데, 예보는 크기를 정하는 내내 눈앞에 있어야 하는 정보다.
   - 차수는 청산선만 올리는 것이 아니라 **국면을 짧게, 뉴스를 잦게** 만든다(`marketFor`).
     청산선만 올리면 잘 읽는 사람에게는 차수가 아무 의미가 없다(측정: 차수 0에서도 4에서도
     청산 0%). 지금은 차트만 읽는 정책의 청산률이 차수 0에서 1%, 7에서 26% 다.

4. **카드는 전역 풀이 아니라 덱에서 뽑힌다.** 시작 덱 6장 → 매 턴 3장 → 쓴 것도 안 쓴
   것도 버린 더미로 → 마르면 섞어 되돌린다. 그래서:
   - 손패를 짚는 열쇠는 `id`(카드 종류)가 아니라 **`uid`(그 장)** 다. 시작 덱에만도 같은
     카드가 두 장씩 있어 `id` 로 짚으면 두 장이 함께 눌린다.
   - 3·6·9턴을 끝내면 보상 카드 셋 중 하나를 덱에 넣는다(`REWARD_TURNS`). **건너뛸 수
     있다** — 덱이 두꺼워지면 원하는 카드가 덜 잡히는 것이 이 게임의 값이다.
   - 가장 센 카드(`pump`·`leak`)에는 저주가 딸려 온다. 유물 `shredder` 만이 덱을 얇게 한다.
   - `TradingScene.beginTurn` 은 **`dealHand()` 를 `onTurnStart()` 보다 먼저** 부른다.
     파쇄기가 손에 잡힌 저주를 보고 태우는 유물이라 순서를 바꾸면 조용히 안 터진다.
   - 4·8턴을 끝내면 유물도 **셋 중에 고른다**(`offerRelics` → `takeRelic`). 그냥 주면
     무엇을 들고 있는지 모른 채 판이 끝나 유물이 왜 있는지 알 수 없게 된다.
   - 카드 정의(`CARD_LIST`)와 유물(`RELIC_POOL`)은 코어가 내보내고 도감이 그대로 읽는다.
     `when`·`effectDescription`·유물 `description` 은 캔버스와 도감에 **날것으로** 찍히니
     마크다운을 넣지 말 것(테스트가 막는다).
   - 카드에 `idleWhen` 을 주면 지금 소용없는 카드가 손패에서 흐려진다. 무엇을 고를지가
     안 보인다는 것이 이 게임의 오래된 약점이었다.

5. **경력 인사이트만은 오직 오른다**(`progress.careerIP`). 쓰는 인사이트는 강화에 나가고
   청산되면 절반이 되지만, 경력은 안 깎인다. 카드·유물 해금이 여기서 열리므로(`UNLOCKS`)
   못한 판 뒤에도 앞으로 간 것이 남는다. 보상·유물 풀은 `RoguelikeManager` 의
   `rewardPool`·`relicPool` 이 해금으로 넓힌다 — 새 카드를 추가하면 처음부터 열지, 해금에
   둘지를 정해야 한다.

6. **예보는 여러 턴 간다.** 정밀 예보가 "두 턴" 이라면서 다음 턴에 사라지면 예고 시황과
   다를 것이 없다. `rememberPeek`/`consumePeek` 이 남은 예보를 들고 가며 한 턴씩 덜어 내고,
   씬은 `mergeRead` 로 새로 읽은 것과 합친다. 카드를 고른 뒤에는 **반드시 `refresh()`** —
   안 부르면 예보도 국면도 "켜짐" 줄도 다음 턴에야 나타난다.

7. **차수가 반복 플레이의 축이다.** 완주하면 +1, 청산되면 −1(`progress.tier`). 차수마다
   청산선이 2%p 올라오고 인사이트를 15% 더 준다. 강화(넷)도 유물(여섯)도 언젠가 차지만
   차수는 안 찬다 — 다시 켤 이유를 여기에 둔다.

### 손대면 안 되는 것

`lib/paper/*` 는 **`/game/classic` 과 워커(idiotquant-worker)가 같이 쓴다.** 여기 규칙을
바꾸면 세 곳이 함께 움직여야 하고, 워커에 같은 규칙의 JS 사본이 있다. 로그라이크용 규칙은
`lib/paper` 를 고치지 말고 `lib/game` 아래에 새로 만들어 얹는다.

### 검증

캔버스는 DOM 셀렉터가 없어 Playwright 가 **좌표로** 누른다. 배치를 바꾸면 테스트가 조용히
어긋나므로, Scene 배치를 고쳤으면 스크린샷으로 눈으로 확인한다. 좌표는 `bandsOf(w, h)` 를
그대로 옮겨 적어 내야 한다 — 설계 격자가 기기마다 다르므로 상수로 박으면 한 기기에서만 맞는다.

**설계 격자는 고정이 아니다.** 짧은 쪽만 고정하고 긴 쪽을 기기에서 받는다(`designSize`).
그래서 씬은 `W`·`H` 같은 모듈 상수를 안 쓰고 `this.scale.width/height` 와 자기 띠의
`b.x`·`b.w` 만 본다. 새 요소를 넣을 때 `W` 를 쓰면 가로 배치에서 왼쪽 칸을 넘어간다.

화면을 돌리면 React 껍데기가 `scale.setGameSize()` + `refresh()` 로 격자를 바꾸고, 씬은
`RESIZE` 를 듣고 **엔진을 그대로 둔 채** 그림만 다시 세운다(`relayout`). `scale.resize()` 는
Scale.RESIZE 모드용이라 FIT 에서는 표시 크기가 옛 비율로 남으니 쓰지 말 것.

글꼴도 마찬가지다. 캔버스는 CSS 로 글꼴을 못 받으므로 `PhaserGame.tsx` 가 host 의
계산된 `font-family` 를 읽어 registry 에 넣고, Scene 은 `fontOf(scene)` 으로 꺼내 쓴다.
`theme.ts` 의 `FONT` 를 직접 쓰면 웹폰트가 아니라 시스템 고정폭으로 그려진다.

```
npx tsc --noEmit          # 에러 0
npm test                  # lib/paper + lib/game/core 규칙 테스트
npm run build             # /game · /game/cards · /game/blind 라우트가 뜨는지
```
