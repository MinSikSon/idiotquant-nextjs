현재 브랜치에서 main 기준 새 PR을 생성한다. CLAUDE.md의 PR 생성 규칙을 따른다.

## 절차

1. `git branch --show-current` 로 현재 브랜치명 확인.
2. `mcp__github__list_pull_requests` (repo: `minsikson/idiotquant-nextjs`, state: `all`, head: 현재 브랜치) 로 기존 PR 조회.
3. 결과에 따라 분기:
   - **PR 없음 또는 open 상태** → 현재 브랜치에서 바로 PR 생성.
   - **PR이 merged** (`merged_at` 값 있음) →
     1. `git fetch origin main`
     2. `git rebase origin/main`
     3. `git push -u origin <branch> --force-with-lease`
     4. `git log origin/main..HEAD` 로 미반영 커밋 확인.
     5. 미반영 커밋 있으면 새 PR 생성, 없으면 사용자에게 "반영할 커밋이 없습니다" 알림.
4. PR base는 항상 `main`.
5. PR 생성 시 `mcp__github__create_pull_request` 사용. body에 변경 요약 포함.
