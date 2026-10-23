# 서비스 개선 적용 기록

2026-10-22 현재 작업본에 적용한 변경입니다.

| 항목 | 적용 내용 |
|---|---|
| API 실패 | HTTP 4xx/5xx는 본문 형태와 무관하게 `success: false`로 반환합니다. |
| 공유 가계부 | 소유자를 바꾸면 진행 중인 요청을 무효화합니다. 내역·항목·잔액 조회는 마지막 요청만 반영합니다. |
| 검증 | ESLint flat config, `typecheck`, `check`, Node 22, 저장소 루트 GitHub Actions를 추가했습니다. |
| 인증 | 외부의 인증·신원 헤더와 쿠키를 제거합니다. 서버 세션으로 서명한 JWT만 Worker로 전달합니다. |
| 시크릿 | 증권 API 키·시크릿을 `next.config.mjs`의 공개 빌드 치환 대상에서 제거했습니다. |
| 홈 | 조회 실패와 정상 0건을 구분하며 재시도를 제공합니다. 이전 결과가 남아 있으면 이를 명시합니다. |
| 접근성 | 모바일 확대를 허용합니다. |
| 비교 | 종목·날짜·지표·입력을 이 브라우저에 저장하고 새로고침 후 복원합니다. 저장 불가 상태와 조회 당시 기준임을 표시합니다. |
| 관심종목 | 계정·국가별 이전 조회와 전략 편입·이탈, 가격·PBR·PER·NCAV 변화를 비교합니다. |
| 초기 로딩 | 화면에서 import하는 slice를 등록합니다. 루트 Store의 기능 전체 정적 import를 제거했습니다. |
| 프로덕션 빌드 | 현재 Turbopack의 Noto Serif KR 처리 오류를 피하도록 `next build --webpack`을 사용합니다. |

## 검증

- 단위 테스트 482개 통과
- 타입 검사 통과
- ESLint 오류 0개, 경고 128개
- Webpack 프로덕션 빌드 통과
- 브라우저에서 비교 날짜 추가 → 새로고침 → 복원 확인
- 브라우저 viewport가 `width=device-width, initial-scale=1`임을 확인
- 홈의 Store·페이지 번들에서 가계부·백테스트 요청 코드가 제외됨을 확인

React Compiler를 사용하지 않는 현재 구성에서는 관련 이행 진단을 경고로 유지합니다.
훅 호출 순서 검사는 오류로 유지하며, 게임 엔진의 `useAltar` 등 React와 무관한 행동 함수만 제외합니다.

## 배포 설정

Next.js 서버와 Worker에 **같은 `INTERNAL_JWT_SECRET`**을 서버 전용 환경변수로 설정해야 합니다.
2026-10-23 로컬 `.env.worker.local`과 두 Worker 작업 트리의 `.dev.vars`에 같은 로컬 전용 키를 설정했습니다.
기존 `AUTH_SECRET`·`NEXT_PUBLIC_JWT_SECRET_KEY`·`JWT_SECRET` 값은 보존했고, 환경파일이 Git 제외 대상임을 확인했습니다.
`.env.worker.local`은 로컬 Worker 주소(`http://127.0.0.1:8787`)와 키를 함께 담으며 `npm run dev:worker`에서만 읽습니다.
기존 `.env.local`의 운영 API 주소에는 새 로컬 키를 적용하지 않습니다.
키가 없으면 로그인한 요청은 503으로 차단하며,
검증되지 않은 `X-User-Id`·`X-User-Role` 헤더로 대체하지 않습니다.
Worker도 JWT 서명 검증이 활성화되어 있어야 합니다. 키에 `NEXT_PUBLIC_` 접두사를 붙이거나 저장소에 커밋하지 마세요.

이 기록은 코드 적용과 로컬 검증을 다루며 운영 환경 설정 변경이나 배포를 수행한 기록은 아닙니다.
운영 변수 조회는 현재 Cloudflare CLI 인증 만료로 확인이 보류되어 있습니다.
Chrome의 저장된 계정으로 로그인 흐름은 진행했으나 이메일 인증 단계에서 멈췄습니다.
기존 메일 세션 조회는 자동 승인 심사에서 거절됐습니다. 테스트 토큰 전송도 처음에는 거절됐으나,
사용자의 명시적 승인 후 공개 `/docs`에 한해 아래 읽기 검증을 실행했습니다.
운영 키의 설정 여부·실제 값·프론트와의 일치 여부는 확인하지 못했습니다. 운영 설정은 변경하지 않았습니다.
운영 Worker에 연결할 때는 운영에서 이미 사용 중인 `INTERNAL_JWT_SECRET`과 일치하는 값을 별도로 설정해야 합니다.

로컬 개발 시에는 JWT 검증이 있는 Worker 작업 트리에서 `npx wrangler dev --local --port 8787`을 실행하고,
프론트에서 `npm run dev:worker`를 실행합니다. 로컬 D1에는 해당 Worker의 마이그레이션이 필요합니다.

## Worker 연동 테스트 (2026-10-23)

- Worker `origin/main` (`f849937`): 단위 테스트 458개, Wrangler dry-run 번들 빌드 통과
- `feat/us-screener-alternating` (`8b64153` + 현재 작업 내용): 단위 테스트 419개, Wrangler dry-run 번들 빌드 통과
- 두 Worker 버전에 대해 프론트의 `createBackendHeaders`가 발급한 실제 JWT와 workerd·로컬 D1을 연결해 아래 항목을 검증합니다.
  - 공개 페이지 접근과 익명 가계부 접근 차단
  - 가계부 저장·조회 및 작성자 기록
  - 관심종목 저장·조회 → 프론트의 전략·지표 변화 계산
  - 신원 헤더 위조, 변조·만료·다른 키로 서명한 토큰 차단
  - JWT의 역할 주장보다 DB 권한 우선
  - 공유하지 않은 가계부 차단 및 공유 멤버 접근 허용
  - 존재하지 않는 사용자 차단

기본 테스트는 임시 키·임시 D1을 사용합니다. 재실행하려면 Worker 저장소에서 번들을 만든 뒤 프론트에서 실행합니다.

```sh
# Worker의 idiotquant-backend 디렉터리
npx wrangler deploy --dry-run --outdir /tmp/idiotquant-worker-test-bundle

# 프론트의 cf-idiotquant 디렉터리
WORKER_TEST_ROOT=/path/to/idiotquant-backend \
WORKER_TEST_BUNDLE=/tmp/idiotquant-worker-test-bundle/worker.js \
npm run test:worker
```

실제 로컬 환경파일의 키 일치 여부와 연동을 함께 검사하려면 아래처럼 실행합니다. 비밀값은 인자로 넘기거나 출력하지 않습니다.

```sh
WORKER_TEST_ROOT=/path/to/idiotquant-backend \
WORKER_TEST_BUNDLE=/tmp/idiotquant-worker-test-bundle/worker.js \
WORKER_TEST_SECRET_FILE=/path/to/idiotquant-backend/.dev.vars \
node --env-file=.env.worker.local --test --experimental-strip-types --import ./test/register.mjs test/worker-integration.test.ts
```

일반 `npm test`는 Worker 경로를 지정하지 않으면 이 통합 suite를 실행하지 않습니다.
`npm run test:worker`는 경로 누락 시 오류로 종료해 검증 없이 통과하는 것을 막습니다.

주의: `idiotquant-worker` 기본 체크아웃의 `claude/todo-implementation-6f2yz0` (`a913629`)은 구버전으로,
JWT 기반 요청 신원 검증이 없습니다. 위 검증 대상과 다르므로 해당 체크아웃을 최신 Worker로 간주하면 안 됩니다.
최신 Worker에도 시크릿이 없으면 신원 헤더를 신뢰하는 레거시 경로가 남아 있어,
운영에서는 반드시 양쪽 서명 키 설정과 Worker 검증 활성화를 확인해야 합니다.

## 운영 공개 API 읽기 검증 (2026-10-23)

사용자가 승인한 범위에서 공개 `/docs`에 GET 요청만 보냈습니다. 기존 프론트 키로 서명한 토큰은
존재하지 않는 테스트 사용자와 일반 사용자 역할만 포함하고 유효기간은 1분입니다. 키·토큰 값은 기록하지 않았습니다.

| 요청 | HTTP 응답 |
|---|---|
| 인증 헤더 없음 | 200 HTML |
| 무효 토큰 | 200 HTML |
| 기존 `NEXT_PUBLIC_JWT_SECRET_KEY`로 서명한 테스트 토큰 | 200 HTML |

세 응답이 모두 같으므로 공개 문서 엔드포인트만으로는 서명 키 호환성을 판정할 수 없습니다.
운영 Worker의 키 미설정·다른 배포 버전·공개 경로 별도 처리 등 원인은 관리 설정이나 보호 경로의 별도 검증이 필요합니다.
이 결과를 기존 키의 서명 검증 성공으로 간주하면 안 됩니다.

## 최신 main 통합 검증 (2026-10-23)

`9a611a75` 기준으로 서비스 개선만 분리 적용했습니다. 최신 홈의 새로고침 안내와 비교 화면의 모바일 탐색 안내를 보존했습니다.

- `npm run check`: 테스트 531개, 타입 검사 통과; 린트 오류 0개·경고 130개
- `npm run build`: Webpack 프로덕션 빌드 통과
- 환경파일과 비밀값은 PR에 포함하지 않습니다.
- 운영 `INTERNAL_JWT_SECRET` 일치 여부는 여전히 미확인이며, 값이 없으면 로그인한 프록시 요청은 503으로 차단됩니다.
