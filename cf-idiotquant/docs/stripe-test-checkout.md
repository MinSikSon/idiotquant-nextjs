# Stripe 테스트 결제

내 계정의 **테스트 결제**에서 관심종목 변화 알림 30일 이용권의 단건 Checkout을 확인할 수 있습니다. Stripe 테스트 가격을 사용하며, 테스트 구매의 효과는 결제 내역 기록까지입니다.

## 로컬 실행

기존 Worker 저장소의 `idiotquant-backend/billing/wrangler.jsonc`는 결제 전용 `idiotquant-billing` Worker 구성입니다. 기존 시세·자동매매 Worker와 배포 및 시크릿을 분리합니다.

1. 테스트용 Supabase 프로젝트에 Worker 저장소의 `supabase/migrations/20261124172000_stripe_test_orders.sql`을 적용합니다.
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

4. 프론트의 `.env.local`에 다음 값을 설정합니다. `NEXT_PUBLIC_API_URL`은 기존 서비스 Worker에 사용합니다.

   | 이름 | 값 |
   | --- | --- |
   | `NEXT_PUBLIC_STRIPE_TEST_CHECKOUT` | `true` |
   | `BILLING_WORKER_URL` | `http://127.0.0.1:8788` |
   | `BILLING_INTERNAL_JWT_SECRET` | 결제 Worker와 같은 값 |

5. Worker 저장소의 `idiotquant-backend/`에서 `npm run dev:billing`을 실행합니다. Stripe CLI로 `stripe listen --events checkout.session.completed --forward-to localhost:8788/billing/webhook`을 실행합니다.
6. 프론트 개발 서버를 실행하고 [로컬 결제 화면](http://localhost:3000/billing)에서 로그인한 뒤 Stripe 테스트 카드로 결제합니다. 화면과 Supabase에서 동일 계정의 결제 성공을 확인합니다. 같은 웹훅을 재전송해도 결제 행은 하나입니다.

## 별도 Worker 배포

`idiotquant-backend/`에서 `npm run deploy:billing`으로 결제 Worker를 배포합니다. Cloudflare의 해당 Worker에만 위 결제 설정을 등록하고, Stripe Sandbox 웹훅은 결제 Worker URL의 `/billing/webhook`으로 등록합니다. 프론트 서버의 `BILLING_WORKER_URL`을 배포된 결제 Worker URL로 지정하고 `BILLING_INTERNAL_JWT_SECRET`을 맞춥니다.

Stripe와 Supabase 키는 Worker에만 보관합니다. Supabase에는 계정 ID, Stripe 세션·Price·PaymentIntent ID, 금액·통화·상태·시간을 저장합니다. Supabase RLS와 테이블 권한은 서버 역할에만 접근을 허용합니다.

[Stripe Checkout 테스트](https://docs.stripe.com/testing) · [Stripe 웹훅 검증](https://docs.stripe.com/webhooks/signature) · [Supabase API 키](https://supabase.com/docs/guides/getting-started/api-keys)
