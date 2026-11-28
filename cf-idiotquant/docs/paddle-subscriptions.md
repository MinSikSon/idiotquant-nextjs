# Paddle 월 구독 결제

프로필의 **이용권 관리**와 뉴스레터의 **과거 적정가**에서 월 9,900원 구독을 시작할 수 있습니다. 결제 Worker가 첫 결제 완료와 구독 상태를 모두 확인하면 과거 적정가 이용권을 활성화합니다. Paddle의 결제 기간에 맞춰 권한이 갱신되며, 해지를 예약하면 해당 기간 종료 시 권한이 만료됩니다. 결제수단 변경과 해지는 결제 이메일로 로그인하는 Paddle 고객 포털에서 처리합니다.

관심종목 메일 발송은 기존과 같이 지정된 테스트 계정에서 검증할 수 있습니다. 이전 토스·Stripe 테스트 구매의 결제 이력과 남은 이용 기간도 조회할 수 있습니다.

## Sandbox 설정

1. Worker 저장소의 `idiotquant-backend/supabase/migrations/`에서 기존 결제 마이그레이션과 최신 `*_paddle_subscriptions.sql`을 테스트 Supabase에 순서대로 적용합니다.
2. Paddle Sandbox에 세금 포함 **KRW 9,900원**, **1개월마다 반복**되는 가격을 만듭니다. 수량은 최소·최대 1, 무료 체험과 지역별 가격 재정의는 사용하지 않습니다. [Paddle 가격 생성](https://developer.paddle.com/api-reference/prices/create-price/)
3. Paddle Checkout의 기본 결제 링크를 해당 환경의 HTTPS `/billing` 주소로 등록합니다. Paddle 알림 대상에는 **결제 Worker의 `/billing/paddle/webhook`** 전체 URL을 등록합니다. [기본 결제 링크](https://developer.paddle.com/build/transactions/default-payment-link/) · [웹훅 안내](https://developer.paddle.com/webhooks/)
4. 웹훅에서 `transaction.completed`, `transaction.canceled`와 `subscription.created`, `subscription.updated`, `subscription.activated`, `subscription.trialing`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`, `subscription.canceled`를 선택합니다.
5. 결제 Worker의 `billing/.dev.vars`에 아래 설정을 넣습니다. 기존 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `BILLING_INTERNAL_JWT_SECRET`, `BILLING_CHECKOUT_ORIGIN`도 계속 사용합니다.

   | 변수 | 값 |
   | --- | --- |
   | `PADDLE_ENVIRONMENT` | `sandbox` |
   | `PADDLE_API_KEY` | 가격 읽기, 거래 읽기·쓰기, 구독 읽기 권한이 있는 Sandbox API 키 |
   | `PADDLE_CLIENT_TOKEN` | `test_`로 시작하는 Paddle.js 토큰 |
   | `PADDLE_PRICE_ID` | 생성한 월 구독의 `pri_` 가격 ID |
   | `PADDLE_WEBHOOK_SECRET` | Paddle 알림 대상의 웹훅 서명 키 |

6. 프론트의 `.env.local`에 `NEXT_PUBLIC_PADDLE_CHECKOUT=true`, `BILLING_WORKER_URL=http://127.0.0.1:8788` 및 Worker와 동일한 `BILLING_INTERNAL_JWT_SECRET`을 설정합니다. Worker는 `npm run dev:billing`, 프론트는 `npm run dev`로 시작합니다. Paddle이 로컬 Worker에 웹훅을 보낼 수 있도록 HTTPS 전달 주소를 등록하거나 Sandbox용 Worker에서 검증합니다.

## 전환과 확인

운영 사이트에서는 **관리자 → 구독관리 → Paddle 구독 테스트**에서 Sandbox 결제와 해지를 확인합니다. 테스트 이용권과 결제 이력은 관리자 테스트 화면에 표시되며 실제 회원 이용권에는 반영되지 않습니다.

- 별도 Worker를 `npx wrangler deploy --config billing/wrangler.admin-sandbox.jsonc`로 배포합니다. 위 Sandbox 변수와 테스트 Supabase 자격 증명을 설정하고, `BILLING_CHECKOUT_ORIGIN`에는 운영 사이트의 오리진을 넣습니다. 이 Worker에는 예약 발송 작업이 없습니다.
- 운영 사이트 서버 환경에 `BILLING_SANDBOX_WORKER_URL`과 이 Worker의 `BILLING_INTERNAL_JWT_SECRET`과 같은 값인 `BILLING_SANDBOX_INTERNAL_JWT_SECRET`을 설정합니다. 운영 결제와 별도의 서명 키를 사용합니다.
- Paddle Sandbox 기본 결제 링크는 운영 사이트의 `/admin/billing/paddle`로, 알림 대상은 Sandbox Worker의 `/billing/paddle/webhook`으로 설정합니다.

- 테스트 결제를 완료하고 이용권 활성화, 과거 적정가 화면 접근, 관리자 결제 이력을 확인합니다. 갱신 시 이용 기간과 이력이 갱신되는지, 해지 예약 시 기간 종료까지 접근 가능한지 확인합니다. Paddle에서 동일 웹훅을 다시 보내도 거래 이력은 한 건으로 유지됩니다.
- 일반 사용자에게 Sandbox를 열려면 Sandbox Worker에 회원 테스트 경로를 배포한 다음 Pages에 `NEXT_PUBLIC_PADDLE_SANDBOX_CHECKOUT=true`를 설정하고 프론트를 배포합니다. 실제 결제 플래그는 끈 상태에서 검증합니다. 로그인한 사용자는 뉴스레터 또는 프로필의 **이용권 관리**에서 테스트 구독을 시작하고 상태를 확인할 수 있습니다. 회원 테스트 이용권은 테스트 Supabase에 저장되며 실제 적정가 과거 비교나 정기 발송 권한을 부여하지 않습니다.
- 첫 결제는 완료됐으나 이용권이 반영되지 않았다면 Paddle 알림 기록에서 `transaction.completed`와 구독 웹훅의 응답을 확인하고 실패한 알림을 다시 보냅니다.
- 운영 전환 시 Paddle의 승인된 도메인과 운영 가격·키·토큰·웹훅을 별도로 설정하고, 운영 Worker에서 `PADDLE_ENVIRONMENT=production`을 사용합니다. Sandbox와 운영 Worker는 별도 Supabase 프로젝트를 사용합니다. 마이그레이션과 Worker를 먼저 반영한 뒤 프론트의 `NEXT_PUBLIC_PADDLE_CHECKOUT=true`를 켭니다. [Paddle 운영 전환 체크리스트](https://developer.paddle.com/build/go-live-checklist/)
