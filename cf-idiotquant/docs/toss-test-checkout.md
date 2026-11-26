# 토스페이먼츠 테스트 결제

오늘의 **알림 혜택 보기**와 내 계정의 **이용권 관리**에서 관심종목 목표가 알림 30일 이용권을 구매할 수 있습니다. 테스트 가격은 9,900원이며 자동 갱신 없이 한 번 결제합니다. 결제 Worker가 토스의 승인 결과, 주문번호, 통화, 금액을 확인한 시각부터 이용권이 30일간 활성화됩니다. 기존 Stripe 테스트 결제 이력도 조회할 수 있습니다.

## 로컬 실행

1. 테스트용 Supabase에 Worker 저장소의 `supabase/migrations/`에서 기존 결제 마이그레이션과 `20261126120000_toss_test_checkout.sql`을 순서대로 적용합니다. 기존 마이그레이션을 적용한 프로젝트에서는 새 파일만 적용합니다.
2. [토스페이먼츠 개발자센터](https://developers.tosspayments.com/)의 **API 키 → 테스트 → API 개별 연동 키**에서 결제창용 클라이언트 키와 시크릿 키를 확인합니다. 계약 전에는 개발 연동 체험 상점을 선택합니다.
3. Worker 저장소의 `idiotquant-backend/billing/.dev.vars`에 아래 값을 설정합니다. 새 파일인 경우 같은 폴더의 `.dev.vars.example`을 복사합니다.

   | 이름 | 값 |
   | --- | --- |
   | `TOSS_TEST_CLIENT_KEY` | 결제창용 `test_ck` 키 |
   | `TOSS_TEST_SECRET_KEY` | 같은 세트의 `test_sk` 키 |
   | `BILLING_CHECKOUT_ORIGIN` | 로컬 프론트 origin인 `http://localhost:3000` |
   | `BILLING_INTERNAL_JWT_SECRET` | Next.js와 공유하는 결제 전용 서명 키 |
   | `SUPABASE_URL` | 테스트 Supabase 프로젝트의 HTTPS URL |
   | `SUPABASE_SECRET_KEY` | 테스트 Supabase의 백엔드용 `sb_secret_` 키 |
   | `WATCHLIST_EMAIL_FROM` | 테스트 발송에 사용할 Cloudflare Email Service 발신 주소 |
   | `WATCHLIST_SANDBOX_RECIPIENT` | 테스트 이메일 발송 대상 로그인 계정 |

4. 프론트의 `.env.local`에 `NEXT_PUBLIC_TOSS_TEST_CHECKOUT=true`, `BILLING_WORKER_URL=http://127.0.0.1:8788`, 결제 Worker와 동일한 `BILLING_INTERNAL_JWT_SECRET`을 설정합니다. 기존 서비스용 `NEXT_PUBLIC_API_URL`은 계속 사용합니다.
5. Worker의 `idiotquant-backend/`에서 `npm run dev:billing`을, 프론트의 `cf-idiotquant/`에서 `npm run dev`를 실행합니다.
6. [로컬 결제 화면](http://localhost:3000/billing)에 로그인해 수신 이메일을 입력하고 토스 테스트 결제를 진행합니다. 돌아온 화면에서 활성 상태와 30일 만료 시각을 확인하고, 개발자센터의 **테스트 결제내역**에서 주문을 대조합니다. [토스 테스트 환경 안내](https://docs.tosspayments.com/guides/v2/get-started/environment)

시크릿 키는 결제 Worker 환경에 보관합니다. 테스트 결제창 복귀 후 Next.js를 통해 Worker가 토스 승인 API를 호출합니다. 같은 승인 요청을 다시 보내도 결제 이력은 한 건으로 유지됩니다. 기존에 시작한 Stripe Sandbox 주문을 마저 처리하려면 기존 Stripe 키와 서명된 웹훅 설정을 유지합니다.

## 이용권과 취소 요청 확인

관리자 **구독관리 → 회원별 구독**에서 계정별 이용권과 결제·발송 이력을 확인할 수 있습니다. **이용권·취소 요청**에서 사용자 요청을 승인하면 이용권이 취소되고 이후 예약 발송이 중단됩니다. 결제 환불은 해당 결제사의 테스트 대시보드에서 별도로 처리합니다.

테스트 이메일 작업은 매일 오전 9시(한국 시간)에 지정된 테스트 계정을 대상으로 실행합니다. 목표가 알림이 있으면 이용권에 등록한 수신 주소로 발송합니다. 로컬에서 스케줄러를 호출하려면 Wrangler 개발 서버를 `--test-scheduled`로 실행하고 `/__scheduled`에 요청을 보냅니다.
