# idiotquant 사이트 리뉴얼 사전 점검 리포트

**점검일**: 2026-07-26
**범위**: idiotquant-nextjs (프론트) + idiotquant-worker (백엔드) 전체
**방법**: `tsc --noEmit` 정적 점검 + 페이지/라우트 전수 코드 리뷰 (읽기 전용, 코드 변경 없음)

---

## 1. 지금 바로 봐야 할 Critical 이슈

### 1-1. 인증 우회 취약점 (프론트 + 백엔드 양쪽)

- **`app/(api)/api/proxy/[...path]/route.ts`**: 서버-서버 인증 토큰을 `NEXT_PUBLIC_JWT_SECRET_KEY`로 서명하고 있습니다. `NEXT_PUBLIC_` 접두사가 붙은 환경변수는 Next.js가 클라이언트 번들에 그대로 포함시키므로, 이 시크릿은 브라우저 JS에서 누구나 꺼내볼 수 있습니다. 즉 사용자가 `role: "admin"` 토큰을 직접 위조해 관리자 API를 호출할 수 있는 구조입니다. `components/loadKakaoTotal.tsx`도 동일 값을 사용합니다.
- **`idiotquant-worker/routes/data/fmp.js`, `data/ai.js`, `auth/oauth.js`**: D1에서 검증한 `user.id`/`user.role`을 쓰지 않고, 클라이언트가 그냥 보내는 `kakaoId` 헤더를 하드코딩된 4명짜리 화이트리스트와 비교해서 접근을 허용하고 있습니다. 코드에 자체적으로 `// [TODO] 로그인 인증 기능 추가 필요`, `// login만 하면, 내 계좌 구경 가능 ㅎㅎ;` 라는 주석이 남아있어 이미 알려진 문제로 보입니다. 반면 `algorithm.js`, `user/likes.js`, `admin.js`는 D1 검증 값을 올바르게 쓰고 있어 참고할 표준 패턴이 이미 있습니다.
- **`app/(admin)/admin/ticker-map/page.tsx`**: `isAdmin` 변수를 계산만 하고 실제 렌더링/액션 어디에도 사용하지 않습니다. 로그인만 하면 종목명 매핑을 추가/수정/삭제할 수 있게 열려 있을 가능성이 높습니다.

세 가지가 사실상 "role 검증이 클라이언트단 값이나 죽은 변수에 의존한다"는 같은 패턴입니다. 리뉴얼 착수 전에 우선 처리를 권합니다.

### 1-2. `/game` 페이지 빌드 깨짐

`npx tsc --noEmit` 결과 `components/game/CombatScene.ts`, `PhaserCombatCanvas.tsx`에서 73개 타입 에러가 발생합니다. 원인은 `Cannot find module 'phaser' or its corresponding type declarations'` — `phaser`는 `package.json`에 있지만 타입 선언을 못 찾아 `CombatScene`이 `Phaser.Scene`을 제대로 상속받지 못하고, 그 여파로 `scale`/`add`/`tweens`/`cameras`/`time` 등 전 속성이 에러 처리됩니다. `npm run build` 시 타입 에러로 막힐 수 있는 상태입니다.

### 1-3. 백엔드 changelog 5주 이상 미기록

`routes/docs.js`의 `#changelog`는 2026-06-18까지만 기록되어 있고 오늘(07-26)까지 5주 이상 공백입니다. 그 사이 스캔 파이프라인이 `ncav_daily`/`ncav_archive`에서 `stock_data_daily`/`stock_data_archive`(멀티 전략: ncav/low_pbr/low_per/s_rim)로 이미 바뀌어 있는 등, CLAUDE.md 문서 자체도 실제 코드보다 뒤처진 상태입니다.

---

## 2. 프론트엔드 페이지별 인벤토리

| 페이지 | 상태 |
|---|---|
| `(home)` | 정상. 다만 3D 히어로 씬 3개(HeroArt/GameCardArt/SpinArt)가 거의 동일 코드 복붙 |
| `(search)/search` | `/analyze`로 리다이렉트만 하는 shim, 실질 로직 없음 |
| `(algorithm-trade)/algorithm-trade` | `/screener`로 서버 리다이렉트하는 6줄짜리 shim — route group 자체 정리 가능 |
| `(screener)/screener` (1330줄) | NCAV 스크리너 메인. `any` 캐스팅 다수, `analyze` 페이지와 유틸 함수 중복 정의, URL↔localStorage 동기화 로직이 복잡(디바운스 300ms)해 버그 여지 있음 |
| `(calculator)/calculator` (1251줄) | 깨진 Tailwind 클래스 다수(5절 참고). localStorage 저장 실패 시 `console.error`만 하고 사용자 알림 없음 |
| `(analyze)/analyze` | 코드 정돈된 편(스켈레톤/BlurGate/Toast 패턴). 타입은 느슨(`Record<string, any>`) |
| `(balance)/balance` | 정상. `balance-kr`/`balance-us`는 `?country=` 쿼리 리다이렉트 shim — 사실상 기능 하나가 라우트 3개로 쪼개져 있음 |
| `(admin)/admin` | 정상 (`isAdmin` 체크 후 렌더 차단) |
| `(admin)/admin/ticker-map` | 위 1-1 참고 — 인증 우회 가능성 |
| `(login)`, `(profile)`, `(game)`, `(legal)/*` | `(game)` 제외 특이사항 없음 |
| `app/legacy/_page.tsx` | 전체 주석 처리된 죽은 파일, 라우팅도 안 됨 — 삭제 대상 |

## 3. Redux / API 레이어

- CLAUDE.md가 규정한 "`result?.success === false` 시 throw" 패턴을 지키는 슬라이스는 `algorithmTrade`, `capital`, `stockLikes` 3개뿐입니다. `koreaInvestment`, `koreaInvestmentUsMarket`, `backtest`, `marketInfo`, `financialInfo` 등 나머지 슬라이스는 백엔드가 `success:false`를 내려도 fulfilled로 처리되어 에러가 조용히 삼켜질 가능성이 있습니다.
- `koreaInvestmentSlice.tsx`(1092줄)와 `koreaInvestmentUsMarketSlice.tsx`(985줄)는 구조가 거의 동일 — KR/US 공용 제네릭 슬라이스로 통합 후보입니다.
- 죽은 슬라이스: `backtestSlice.tsx`(실제 `/backtest` 페이지는 `algorithmTradeSlice`를 사용), `_backtestSlice.tsx`, `filter`, `fmpUsMarket`, `timestamp` — store에 등록만 되어 있고 어떤 컴포넌트도 사용하지 않습니다.
- `console.log` 잔재가 다수 슬라이스/API 파일에 남아 있습니다.

## 4. 백엔드 라우트별 이슈

| 라우트 | 이슈 |
|---|---|
| `routes/market/stock.js` | `marketInfoMap`이 2024년 3분기 데이터로 하드코딩 고정. 응답 형태도 `{success,data}` 아닌 raw JSON |
| `routes/market/algorithm.js` | 문자열 파싱 기반 라우팅이라 취약. `// TODO: allKeys list를 별도 kv로 등록` 미해결. 주석 처리된 하드코딩 화이트리스트 흔적 있음 |
| `routes/timestamp.js` | 번호 매긴 디버그 로그 `(1)~(14)` 잔재, `request.json()` 무가드, `payload.properties.nickname` null 체크 없음, 미사용 `GetTimestamp` 함수 |
| `routes/auth/login.js` | `UserInfo`/`StarredStocks` POST가 `request.json()`을 try/catch 없이 호출 — 잘못된 입력 시 그대로 throw |
| `routes/admin.js`, `admin/tickerMap.js`, `user/likes.js` | 정상 — 현재 코드베이스에서 가장 정돈된 스타일 |

**services**: `ncavScanner.js`/`ncavScanKr.js`는 종목별 try/catch가 있어 비교적 견고합니다. 다만 `runNcavArchive`(월간 크론)가 이제 "롤링 아카이브로 대체됨, 작업 없음" 상태의 no-op 스텁이라 CLAUDE.md 설명과 실제 동작이 다릅니다.

**scheduled trading**: `trading/kr.js`의 `_doKrAlgoTrading`은 종목별 매수/매도 루프에 try/catch가 없어, KIS 응답 하나가 이상하면 해당 유저의 그 틱 전체가 조용히 중단됩니다(`ctx.waitUntil` 내부라 실패가 눈에 안 띔). 재시도/백오프 로직도 없습니다. `DEBUG = true`가 하드코딩되어 있고, `us.js:291`에는 미구현 핼러윈 전략 TODO가 있습니다. 휴장일 처리도 없습니다.

## 5. 크로스커팅 UX/디자인 불일치

1. **깨진 Tailwind 클래스**: `text-[#f0fdf4]0` 형태의 오타가 `screener`, `analyze`, `calculator`(2곳), `not-found.tsx`, `strategyParser.tsx`, `LineChart.tsx`, `FinnhubTable.tsx` 총 8개 파일에 반복됩니다. `#16a34a`(브랜드 그린)를 쓰려다 편집 실수로 `#f0fdf4]0`가 된 것으로 보이며, Tailwind가 무시해서 해당 요소가 조용히 기본색으로 렌더링됩니다.
2. **아이콘 라이브러리 혼용**: 대부분 `lucide-react`를 쓰는데 `calculator`만 `@heroicons/react`를 씁니다. `iconoir-react`는 설치돼 있지만 실사용처가 불명확합니다.
3. **라우트 3중 중복**: `balance`/`balance-kr`/`balance-us`, `search`→`analyze`, `algorithm-trade`→`screener` — 기능은 하나인데 URL과 route group이 여러 개로 쪼개져 있어 리뉴얼 시 정리 대상입니다.

## 6. 정리(삭제) 후보 요약

- `app/legacy/_page.tsx` (완전 죽은 파일)
- `lib/features/backtest/backtestSlice.tsx`, `_backtestSlice.tsx`, `filter`/`fmpUsMarket`/`timestamp` 슬라이스 (미사용)
- `(search)`, `(algorithm-trade)` route group (단순 리다이렉트 shim — 유지할지 정리할지는 SEO/북마크 영향 확인 필요)
- `idiotquant-worker/trading/_archive/*` (기존에도 legacy로 알려진 파일, 그대로 유지 권장)

---

## 다음 단계 제안 (실행 전 확인 필요)

이번 패스는 **점검만** 진행했고 코드는 건드리지 않았습니다. 다음 중 어디부터 손댈지 알려주시면 그에 맞춰 진행하겠습니다.

1. 인증 우회 3건(1-1) — 보안 관련이라 가장 먼저 권장
2. `/game` 페이지 타입 에러(1-2) — phaser 타입 선언 문제만 고치면 빌드 자체는 정상화될 가능성
3. 깨진 Tailwind 클래스 8곳 — 기계적 치환이라 리스크 낮고 빠르게 처리 가능
4. 라우트 중복 정리 / 죽은 슬라이스 제거 — 리뉴얼 범위와 함께 논의 필요
5. changelog 백필 + CLAUDE.md 문서 최신화
