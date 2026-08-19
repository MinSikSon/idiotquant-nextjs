---
name: cloudflare-d1
description: Cloudflare D1 스키마·데이터 변경을 Cloudflare 대시보드에서 바로 실행할 수 있는 형태로 안내한다. 테이블·인덱스 추가, 컬럼 변경, 마이그레이션 파일 작성, 데이터 보정 SQL, `wrangler d1` 명령이 필요해 보이는 모든 상황에서 반드시 사용한다. `migrations/` 에 파일을 만들거나 `ledger_entries`·`stock_likes`·`ncav_daily` 같은 D1 테이블을 건드릴 때, 사용자가 "D1", "마이그레이션", "테이블 추가", "스키마" 를 언급할 때, 그리고 워커 배포 안내를 쓸 때도 이 스킬을 먼저 읽는다. 사용자는 터미널 대신 대시보드로 작업하므로 wrangler CLI 만 알려주면 실행할 수 없다.
---

# Cloudflare D1 — 대시보드 우선

이 프로젝트의 D1 작업은 **Cloudflare 대시보드에서 실행된다.** `npx wrangler d1 migrations apply` 만 알려주면 사용자는 그대로 멈춘다. 그러니 D1 이 바뀌는 작업을 했으면, 대시보드에 그대로 붙여넣을 수 있는 SQL 을 항상 함께 낸다.

wrangler 명령을 아예 쓰지 말라는 뜻은 아니다. **대시보드 방법이 먼저고, CLI 는 참고로 뒤에 둔다.**

## 이 프로젝트의 D1

| 바인딩 | 데이터베이스 | 용도 |
|---|---|---|
| `D1_IDIOTQUANT_MAIN` | `idiotquant_main` | 유저·가계부·NCAV·자동매매 등 대부분 |
| `D1_IQ_SEARCH_LOG` | (검색 로그 전용) | `/api/search-log` |

스키마와 마이그레이션은 **`idiotquant-worker` 레포**(`idiotquant-backend/`)에 있다. `idiotquant-nextjs` 는 `/api/proxy` 를 거쳐 워커를 부를 뿐 D1 에 직접 닿지 않는다. 프론트만 고쳤다면 D1 안내는 필요 없다.

## 마이그레이션 파일을 만들 때

**두 곳에 넣어야 한다.** 하나만 하면 `test/migrate.test.js` 가 실패한다 — Workers 에는 파일시스템이 없어 `.sql` 을 번들에 문자열로 싣기 때문이다.

1. `idiotquant-backend/migrations/NNNN_이름.sql` — 번호는 `ls migrations/` 로 마지막 것 다음
2. `idiotquant-backend/src/migrations.js` — `import` 한 줄 + `MIGRATIONS` 배열 한 줄

**되돌려 실행해도 괜찮게 쓴다.** 대시보드로 한 번, 나중에 마이그레이션 러너로 또 한 번 실행될 수 있다. `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `INSERT OR IGNORE` 를 기본으로 쓴다. (러너도 한 파일이 중간에 실패하면 이력을 남기지 않고 다음에 재실행한다 — 그래서 재실행 안전성이 전제다.)

## 사용자에게 낼 안내 — 이 형태로

D1 이 바뀌는 PR 을 만들었으면 **PR 본문과 채팅 답변 양쪽에** 아래 골격으로 적는다.

### 방법 A — D1 Console 에 붙여넣기 (배포 순서와 무관, 기본값)

**Storage & Databases → D1 SQL Database → `idiotquant_main` → Console**

```sql
-- 마이그레이션 파일과 똑같은 DDL 을 그대로

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('NNNN_이름.sql');
```

마지막 줄을 빼먹지 말라고 반드시 덧붙인다. wrangler 와 `/dashboard/migrate` 는 적용 이력을 `d1_migrations` 테이블에서 읽는다. 콘솔에서 손으로 만들면 그 기록이 남지 않아 **다음 번에 "미적용"으로 떠서 다시 실행하려 든다.** (DDL 이 `IF NOT EXISTS` 라 재실행 자체는 무해하지만, 이력을 맞춰두는 편이 깔끔하다.)

콘솔이 한 번에 한 문장만 받으면 문장별로 나눠 실행하라고 알려준다.

### 방법 B — 워커의 `/dashboard/migrate` (배포 후에만)

이 워커에는 마이그레이션 적용용 웹 화면이 있다(`src/routes/admin/migrate.js`). 이력이 자동으로 남는 게 장점이다.

다만 **배포된 번들에 실린 `MIGRATIONS` 를 실행**하므로, 새 마이그레이션을 적용하려면 그 코드가 먼저 배포돼 있어야 한다. 순서를 반드시 명시한다.

1. `MIGRATION_TOKEN` 시크릿이 없으면 대시보드에서 추가 — **Workers & Pages → idiotquant-backend → Settings → Variables and Secrets → Add**, Type `Secret`
2. `https://<워커 도메인>/dashboard/migrate` → 토큰 입력 → 상태 보기 → 미적용 적용

### 배포는 대시보드만으로 안 된다

워커 레포에 CI 워크플로가 없어 배포는 `npm run deploy`(wrangler) 가 필요하다. 이걸 숨기지 말고 그대로 알린다. 대시보드만으로 하려면 Cloudflare Workers Builds 에 저장소를 연결해야 한다고 덧붙인다.

### 순서와 안전성을 함께 말한다

"테이블이 없어도 배포는 안전한가", "배포가 먼저인가 테이블이 먼저인가" 는 사용자가 실제로 궁금해하는 지점이다. 새 테이블을 **그 기능의 코드만 읽는다면** 순서는 무관하고 배포가 먼저여도 안전하다 — 그 화면에 들어가기 전까지 아무도 그 테이블을 건드리지 않기 때문이다. 이런 판단을 대신 해서 한 줄로 적어준다.

## 데이터 보정 SQL 일 때

스키마가 아니라 데이터를 고치는 일이라면 마이그레이션 파일 없이 콘솔 SQL 만 낸다. 이때는:

- `UPDATE`·`DELETE` 앞에 **먼저 돌려볼 `SELECT`** 를 같이 준다. 몇 행이 걸리는지 보고 실행하게 한다.
- `WHERE` 없는 `UPDATE`/`DELETE` 는 내지 않는다. 정말 전체가 대상이면 그렇다고 명시적으로 쓴다.
- 되돌릴 수 없는 작업이면 그 사실을 문장으로 적는다.

## 하지 말 것

- `npx wrangler d1 migrations apply ...` 만 적고 끝내기 — 사용자는 실행할 수단이 없다.
- 대시보드 경로를 얼버무리기("D1 콘솔에서 실행하세요"). **Storage & Databases → D1 SQL Database → `idiotquant_main` → Console** 처럼 끝까지 적는다.
- `d1_migrations` 한 줄 빠뜨리기 — 가장 자주 놓치는 지점이다.
- 프론트만 바뀐 PR 에 D1 안내를 붙이기 — 필요 없는 절차를 늘린다.
