# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behavioral Guidelines

**Always think in English.** Regardless of the language used in the request, reason and think in English.

**Explain results in Korean.** While thinking in English, write explanations and responses to the user in Korean.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Commands

All commands run inside `cf-idiotquant/`:

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server (`next dev`) |
| `npm run build` | Production build |
| `npx tsc --noEmit` | Type check (pre-push) |

## Folder Structure

```
cf-idiotquant/
├── app/                        # Next.js App Router 페이지
│   ├── (algorithm-trade)/      # 자동매매 / NCAV 스크리너
│   ├── (search)/               # 종목 검색
│   └── api/proxy/[...path]/    # Cloudflare Worker 프록시
├── lib/
│   ├── features/               # Redux Toolkit slices + API 함수
│   │   ├── algorithmTrade/     # 자동매매 상태 (slice + API)
│   │   ├── backtest/           # 백테스트 slice
│   │   ├── koreaInvestment/    # KIS 국내 시장 slice
│   │   └── koreaInvestmentUsMarket/ # KIS 미국 시장 slice
│   ├── store.ts                # Redux store
│   ├── hooks.ts                # typed dispatch / selector hooks
│   └── createAppSlice.ts       # createAppSlice wrapper
├── components/                 # 공통 컴포넌트
│   └── utils/financeCalc.ts    # NCAV 비율 계산 유틸
└── public/data/                # 종목 코드 JSON (validCorpCode, usStockSymbols)
```

## Architecture

- **Pages** — `app/` 하위 route별 `page.tsx`. `"use client"` 컴포넌트에서 Redux dispatch.
- **Proxy** — `app/api/proxy/[...path]/route.ts` 가 모든 백엔드 호출을 `NEXT_PUBLIC_WORKER_BASE_URL`로 포워딩.
- **Redux pattern** — `createAppSlice` + `create.asyncThunk`. fulfilled/rejected 핸들러에서 `result?.success === false` 시 throw해서 rejected 상태로 전환.
- **D1 NCAV section** — `algorithmTrade` slice의 `ncavDailyList` / `ncavDailyDates` 상태. `/ncav/daily` 배포된 엔드포인트 사용. `/ncav/daily/dates` 미배포 시 `reqDiscoverNcavDates` thunk로 클라이언트 자동 탐색.

## PR 생성 규칙

작업 완료 후 PR을 만들기 전에 항상 기존 PR 상태를 확인한다.

1. `mcp__github__list_pull_requests` (state: `all`, head: 현재 브랜치)로 기존 PR을 조회한다.
2. **PR이 없거나 open 상태**이면 현재 브랜치에서 바로 PR을 생성한다.
3. **PR이 이미 merged**이면 (`merged_at` 값이 있으면 merged로 판단):
   - `git fetch origin main` 후 `git rebase origin/main` 으로 브랜치를 main tip에 맞춘다.
   - `git push -u origin <branch> --force-with-lease` 로 푸시한다.
   - 미반영 커밋(`git log origin/main..HEAD`)이 있으면 새 PR을 생성한다.
   - 미반영 커밋이 없으면 PR 생성 없이 사용자에게 알린다.
4. PR base는 항상 `main`으로 한다.

## Opus 4.8 프롬프팅 가이드 (모델 특성 반영)

이 저장소에서 Claude Opus 4.8로 작업할 때 조정이 필요한 동작들. (근거: Opus 4.8 공식 프롬프팅 가이드)

### Effort 설정
- 이 저장소의 코딩·리팩터링·에이전트 작업은 **`xhigh`** 를 기본으로 한다.
- 비용/지연이 민감한 단순 조회만 `medium` 이하로 내린다.
- 복잡한 문제에서 추론이 얕게 느껴지면 프롬프트로 우회하지 말고 **effort를 올린다.**

### 응답 길이
- 단순 조회엔 짧게, 개방형 분석엔 길게 자동 보정된다. 과설명이 보이면 프롬프트로 다음을 명시한다:
  > 핵심만 간결하게. 불필요한 배경 설명·장황한 예시 생략.

### 문자 그대로의 지침 준수
- Opus 4.8은 지침을 **문자 그대로** 해석하고 요청하지 않은 것을 추론하지 않는다. 이 문서의 "Surgical Changes" 원칙과 잘 맞는다.
- 넓게 적용하길 원하면 범위를 명시한다. 예: "이 slice뿐 아니라 `algorithmTrade`, `backtest`, `koreaInvestment` 세 slice 모두에 동일 패턴 적용."

### 도구·서브에이전트 절제
- Opus 4.8은 도구 호출·서브에이전트를 기본적으로 절제한다. 불필요한 스캐폴딩("N번마다 진행 요약")은 제거한다.
- 서브에이전트는 **직접 처리 가능한 작업엔 쓰지 않는다.** 여러 파일을 병렬로 읽거나 종목 리스트처럼 항목별 팬아웃이 필요할 때만 같은 턴에 여러 개 띄운다.

### 프론트엔드/게임 UI 디자인 ⚠️ 중요
- Opus 4.8은 강한 하우스 스타일(크림/오프화이트 배경 `#F4F1EA`, 세리프 디스플레이 서체, 테라코타 악센트)을 기본으로 밀어붙인다. 이 저장소의 **포켓로그급 전투 씬·바이옴 배경·게임 UI에는 전혀 맞지 않는다.**
- "크림색 쓰지 마" 같은 일반 지침은 또 다른 고정 팔레트로 옮겨갈 뿐이다. 대신 **구체적 사양을 지정**하거나 **구축 전 방향 제안을 요청**한다.
  > 구축 전, 이 게임 씬에 맞는 4가지 시각 방향을 제안하라(각각: 배경 hex / 악센트 hex / 서체 — 한 줄 근거). 사용자가 하나 고르면 그것만 구현하라.
- 새 프론트엔드 컴포넌트엔 이 스니펫을 함께 쓴다:
  ```
  <frontend_aesthetics>
  Inter/Roboto/Arial/system font, 보라 그라디언트, 뻔한 레이아웃 등 일반적 "AI slop" 미학을 쓰지 마라. 고유한 폰트, 응집력 있는 색·테마, 마이크로 인터랙션 애니메이션을 사용하라.
  </frontend_aesthetics>
  ```

### 코드 리뷰 (recall 유지)
- Opus 4.8은 "심각도 높은 것만", "보수적으로" 같은 지침을 **더 충실히** 따라 저심각도 발견을 누락할 수 있다. 포괄적 탐지를 원할 때는:
  > 확신이 없거나 저심각도인 것을 포함해 발견한 모든 이슈를 보고하라. 이 단계에선 중요도/신뢰도로 필터링하지 마라 — 커버리지가 목표다. 각 발견에 신뢰도와 추정 심각도를 함께 표기하라.

## Claude Fable 5 프롬프팅 가이드 (모델 특성 반영)

Fable 5는 Opus 4.8보다 역량·자율성·장시간 실행이 크게 향상된 모델. 아래는 이 저장소에서 조정이 필요한 동작들. (근거: Fable 5 공식 프롬프팅 가이드)

### Effort 설정
- 대부분 작업은 **`high`** 를 기본, 가장 어려운 작업만 `xhigh`, 일상 작업은 `medium`/`low`. (Fable 5의 `low`도 이전 모델 `xhigh`를 능가하는 경우가 많다.)
- 상호작용적인 빠른 작업을 원하면 effort를 낮춘다.

### 과잉 계획·장황함 억제
- Fable 5는 높은 effort에서 추구하지 않을 옵션을 조사하거나 과도하게 설명할 수 있다. 결론부터 말하게 한다:
  > 행동하기에 충분한 정보가 있으면 행동하라. 이미 확정된 사실을 재도출하거나, 사용자가 이미 내린 결정을 다시 따지거나, 추구하지 않을 선택지를 나열하지 마라. 선택을 저울질한다면 전수 조사가 아니라 하나의 권고를 제시하라.
  > 결과부터 말하라. 작업 종료 후 첫 문장은 "무슨 일이 있었는가/무엇을 찾았는가"에 답해야 한다. 근거·세부는 그다음. 간결함보다 가독성이 우선이다.

### 경계 명시 (요청하지 않은 작업 방지)
- 이 문서의 "Surgical Changes"를 Fable 5에 맞게 강화한다. Fable 5는 방어적 git 브랜치 백업 생성, 요청 안 한 리팩터링 등을 할 수 있다.
  > 사용자가 문제를 설명하거나 질문하거나 생각을 정리하는 중이면 산출물은 "당신의 진단"이다. 발견을 보고하고 멈춰라. 요청하기 전엔 수정하지 마라.
  > 버그 수정에 주변 정리는 불필요하고, 일회성 작업에 헬퍼는 대개 불필요하다. 발생할 수 없는 시나리오용 에러 처리·폴백·검증을 추가하지 마라. 검증은 시스템 경계(사용자 입력, 외부 API)에서만 한다.
- 이 저장소의 PR/브랜치 규칙(`## PR 생성 규칙`)을 벗어나는 방어적 브랜치·커밋을 임의로 만들지 않는다.

### 진행 상황 근거 확보
- 장시간·다단계 작업에서 상태를 실제 도구 결과에 대해 감사한다. (이 문서 상단 harness 규칙과 동일 취지.)
  > 진행 상황을 보고하기 전, 각 주장을 이 세션의 도구 결과와 대조하라. 증거를 가리킬 수 있는 작업만 보고하고, 미검증이면 명시하라. 테스트가 실패하면 출력과 함께 그렇다고 말하고, 건너뛴 단계는 건너뛰었다고 말하라.

### 병렬 서브에이전트
- Fable 5는 병렬 서브에이전트를 안정적으로 운용한다. 다만 이 플랜에선 spawn이 비싸므로 **사용자가 명시적으로 요청할 때만** 쓴다. 사용할 땐 독립 하위작업을 위임하고 블로킹하지 말라:
  > 독립적인 하위작업은 서브에이전트에 위임하고, 실행되는 동안 계속 작업하라. 서브에이전트가 이탈하거나 컨텍스트가 부족하면 개입하라.

### 메모리 활용
- 이 저장소는 이미 `memory/` 시스템(MEMORY.md 인덱스)을 갖고 있다. Fable 5는 과거 교훈을 기록·참조할 때 특히 잘 수행하므로, 확정된 접근/수정 이유를 파일당 하나씩 계속 축적한다. 중복 대신 기존 노트를 갱신하고, 틀린 노트는 삭제한다.

### 요청의 "이유"도 제공
- Fable 5는 의도를 알 때 더 잘 수행한다. 큰 목표·대상·산출물의 용도를 앞서 명시하면 자율성과 정확도가 올라간다:
  > [더 큰 작업]을 [누구]를 위해 하는 중이고, [산출물이 가능케 하는 것]이 필요하다. 그 맥락에서: [요청].

### 스캐폴딩 주의
- Fable 5는 이전 모델용으로 만든 규범적 스킬/지침이 오히려 품질을 떨어뜨릴 수 있다. 오래된 지시는 검토 후 제거를 고려한다.
- **응답 텍스트에 내부 추론을 재현·전사하도록 지시하지 않는다.** `reasoning_extraction` 거부를 유발해 Opus 4.8 폴백을 늘릴 수 있다.
