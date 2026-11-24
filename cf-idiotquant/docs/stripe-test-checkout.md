# Stripe 테스트 결제

오늘의 **알림 혜택 보기**와 내 계정의 **이용권 관리**에서 관심종목 목표가 알림 30일 이용권을 확인할 수 있습니다. 수신 이메일 한 개를 입력하고 Stripe Sandbox 단건 결제를 완료하면 30일간 활성화됩니다. 기존 테스트 결제 기록은 그대로 조회할 수 있습니다.

## 로컬 실행

기존 Worker 저장소의 `idiotquant-backend/billing/wrangler.jsonc`는 결제 전용 `idiotquant-billing` Worker 구성입니다. 기존 시세·자동매매 Worker와 배포 및 시크릿을 분리합니다.

1. 테스트용 Supabase 프로젝트에 Worker 저장소의 `supabase/migrations/20261124172000_stripe_test_orders.sql`, `20261124230000_watchlist_digest.sql`, `20261125090000_watchlist_recipients.sql`을 순서대로 적용합니다.
2. Stripe Sandbox에서 단건 고정가 Price를 만듭니다.
3. `idiotquant-backend/billing/.dev.vars.example`을 같은 폴더의 `.dev.vars`로 복사하고 결제 Worker의 설정을 입력합니다.

   | 이름 | 값 |
   | --- | --- |
   | `BILLING_INTERNAL_JWT_SECRET` | Next.js와 공유하는 결제 전용 서명 키 |
   | `STRIPE_SECRET_KEY` | Stripe Sandbox의 `sk_test_` 키 |
   | `STRIPE_TEST_PRICE_ID` | 테스트용 단건 `price_` ID |
   | `STRIPE_WEBHOOK_SECRET` | Stripe CLI가 발급한 로컬 웹훅 시크릿 |
   | `STRIPE_CHECKOUT_ORIGIN` | 로컬 프론트 origin인 `http://localhost:3000` |
   | `SUPABASE_URL` | 테스트 Supabase 프로젝트의 HTTPS URL |
   | `SUPABASE_SECRET_KEY` | 테스트 Supabase의 백엔드용 `sb_secret_` 키 |
   | `WATCHLIST_EMAIL_FROM` | Cloudflare Email Service에서 사용할 발신 주소 |
   | `WATCHLIST_SANDBOX_RECIPIENT` | 발송 대상에 포함할 Sandbox 테스트 로그인 계정 이메일 |

4. 프론트의 `.env.local`에 다음 값을 설정합니다. `NEXT_PUBLIC_API_URL`은 기존 서비스 Worker에 사용합니다.

   | 이름 | 값 |
   | --- | --- |
   | `NEXT_PUBLIC_STRIPE_TEST_CHECKOUT` | `true` |
   | `BILLING_WORKER_URL` | `http://127.0.0.1:8788` |
   | `BILLING_INTERNAL_JWT_SECRET` | 결제 Worker와 같은 값 |

5. Worker 저장소의 `idiotquant-backend/`에서 `npm run dev:billing`을 실행합니다. Stripe CLI로 `stripe listen --events checkout.session.completed --forward-to localhost:8788/billing/webhook`을 실행합니다.
6. 프론트 개발 서버를 실행하고 [로컬 결제 화면](http://localhost:3000/billing)에서 로그인한 뒤 Stripe 테스트 카드로 결제합니다. 화면에서 이용권 활성 상태와 만료 시각을 확인합니다. 같은 웹훅을 재전송해도 결제 행은 하나입니다.

이메일 작업은 매일 오전 9시(한국 시간)에 지정된 Sandbox 계정의 좋아요 종목을 조회합니다. 프론트의 인증된 내부 경로가 분석 페이지와 같은 모델로 목표가를 산출합니다. 새 현황이 있으면 이용권에 등록된 주소로 발송합니다. 이전에 주소를 여러 개 등록한 이용권은 첫 번째 주소를 사용합니다. 수신 주소 입력 기능이 생기기 전에 활성화된 이용권은 지정된 테스트 계정의 이메일을 사용합니다. 로컬에서 스케줄러를 호출하려면 Wrangler 개발 서버를 `--test-scheduled`로 실행하고 `/__scheduled`에 요청을 보냅니다.

## Admin에서 조회

`/admin`의 **이용권 관리**에서 로그인 이메일 또는 계정 ID 전체를 입력합니다. Worker가 로그인 계정의 현재 관리자 권한을 D1에서 확인한 후, 대상 계정의 테스트 결제·이용권·메일 이력을 조회합니다. Stripe 결제 상세는 결제 확인 후 저장된 PaymentIntent로 연결합니다. 메일의 **발송 수락**은 Cloudflare가 발송 요청을 수락한 시각입니다. 수락 기록 없이 처리 시작 시각만 있으면 **발송 결과 미확인**으로 표시합니다.

## 별도 Worker 배포

`idiotquant-backend/`에서 `npm run deploy:billing`으로 결제 Worker를 배포합니다. Cloudflare의 해당 Worker에만 위 결제 설정을 등록하고, Stripe Sandbox 웹훅은 결제 Worker URL의 `/billing/webhook`으로 등록합니다. 프론트 서버의 `BILLING_WORKER_URL`을 배포된 결제 Worker URL로 지정하고 `BILLING_INTERNAL_JWT_SECRET`을 맞춥니다.

Stripe와 Supabase 키는 Worker에만 보관합니다. Supabase에는 계정 ID, Stripe 세션·Price·PaymentIntent ID, 금액·통화·상태·시간과 알림 수신 주소를 저장합니다. Supabase RLS와 테이블 권한은 서버 역할에만 접근을 허용합니다.

## 판매 전 준비

판매 상품은 **관심종목 목표가 알림 30일 이용권**입니다. 현재 Sandbox 기준 ₩9,900 단건 결제로 검증했습니다. 결제가 확인되면 즉시 시작되고 30일 후 만료됩니다. 매일 오전 9시(KST) 작업은 좋아요한 종목의 전략별 목표가 도달 여부를 확인해 새 현황을 이메일로 발송합니다. 자동 갱신은 없습니다.

- Sandbox 스케줄러는 지정된 테스트 계정 한 개를 대상으로 합니다. 일반 구매자에게 제공하기 전에 Cloudflare 발신 도메인 설정과 활성 이용권별 이메일 발송·중복 방지·만료를 검증합니다. [Cloudflare 발송 설정](https://developers.cloudflare.com/email-service/configuration/send-bindings/)
- 실결제용 Stripe 상품·가격·웹훅과 운영 결제 저장소를 준비한 뒤, 테스트 데이터와 분리된 운영 경로에서 결제 확인과 환불 후 이용권·발송 종료를 확인해야 합니다. 배포된 Sandbox Worker는 `sk_test_`만 허용합니다. [Stripe 출시 체크리스트](https://docs.stripe.com/get-started/checklist/go-live)
- 판매 가격과 환불·문의 안내를 확정하고, 운영 사이트에서 결제 확인 → 30일 활성 → 첫 메일 수신 → 만료 시 발송 중단을 검증한 뒤 실제 결제를 엽니다.

[Stripe Checkout 테스트](https://docs.stripe.com/testing) · [Stripe 웹훅 검증](https://docs.stripe.com/webhooks/signature) · [Supabase API 키](https://supabase.com/docs/guides/getting-started/api-keys)
