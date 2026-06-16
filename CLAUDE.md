# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behavioral Guidelines

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
