# 회원 무료 종목 메일

회원은 오늘 화면이나 내 계정의 **무료 종목 메일**에서 수신을 신청합니다. 가입 이메일은 신청 즉시 등록됩니다. 다른 이메일은 링크로 인증한 뒤 등록되며, 주소는 한 개만 활성화됩니다. 같은 화면에서 수신을 해제할 수 있습니다.

관리자는 **어드민 대시보드 → 발송 종목 관리**에서 공통 발송 목록과 메일 제목·안내 문구를 관리하고 실제 메일 본문을 미리 볼 수 있습니다. 저장한 문구는 다음 발송부터 적용됩니다. 미리보기의 가격과 목표가는 조회 시점 기준이며 발송 시 다시 조회합니다. 오전 9시(KST) 작업은 활성 수신 주소마다 하루 한 번, 해당 목록의 분석 전략별 목표가 도달 현황을 발송합니다. 발송 목록이 비어 있거나 판정 가능한 종목이 없으면 발송을 건너뜁니다.

## 운영 적용

1. Worker 저장소의 `idiotquant-backend/`에서 D1 마이그레이션 `0050_member_mailing.sql`과 `0051_member_mailing_format.sql`을 순서대로 적용합니다. 기존 운영 환경에는 Worker 배포 전에 `0051`을 적용합니다.
2. 결제 Worker `idiotquant-billing`에 프론트 주소인 `MEMBER_MAILING_ORIGIN`, 발신 주소인 `WATCHLIST_EMAIL_FROM`, 프론트와 공유하는 `BILLING_INTERNAL_JWT_SECRET`을 설정합니다. Cloudflare 발신 도메인과 `WATCHLIST_EMAIL` 바인딩으로 실제 수신 주소에 발송할 수 있는지 확인합니다. [Cloudflare Email 발송 설정](https://developers.cloudflare.com/email-service/configuration/send-bindings/)
3. 프론트의 `BILLING_WORKER_URL`과 `BILLING_INTERNAL_JWT_SECRET`을 결제 Worker에 맞춰 배포합니다. 무료 종목 메일은 Stripe 설정과 별개로 동작합니다.
4. 관리자가 발송 종목을 추가한 뒤 테스트 회원으로 가입 이메일 수신 신청, 별도 주소 인증, 발송, 수신 해제를 확인합니다. 로컬 스케줄은 결제 Worker를 `--test-scheduled`로 실행한 뒤 `/__scheduled`에서 호출할 수 있습니다.
