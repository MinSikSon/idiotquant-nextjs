-- 1. 사용자 테이블 (인증 정보 + 구독/과금 상태)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,               -- Auth.js 생성 고유 ID
    name TEXT,                         -- 사용자 이름
    email TEXT UNIQUE,                 -- 사용자 이메일
    image TEXT,                        -- 카카오 프로필 사진 URL
    emailVerified INTEGER,             -- 이메일 인증 여부 (타임스탬프)
    
    -- [과금 및 구독 관리 필드]
    plan TEXT DEFAULT 'free',          -- 요금제: free, pro, business
    subscriptionStatus TEXT DEFAULT 'none', -- 상태: active, canceled, past_due, none
    stripeCustomerId TEXT,             -- PG사(Stripe, PortOne 등) 고객 식별자
    expiresAt INTEGER,                 -- 구독 만료 시점 (Unix Timestamp)
    
    createdAt INTEGER DEFAULT (strftime('%s', 'now')), -- 가입일
    updatedAt INTEGER DEFAULT (strftime('%s', 'now'))  -- 수정일
);

-- 2. 소셜 계정 연결 정보 (OAuth 관련)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,            -- 'kakao', 'google' 등
    providerAccountId TEXT NOT NULL,   -- 카카오측 유저 고유 ID
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

-- 3. 결제 이력 테이블 (영수증 및 매출 통계)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,               -- 결제 고유 번호
    userId TEXT NOT NULL,              -- 결제한 유저 ID
    amount INTEGER NOT NULL,           -- 결제 금액
    currency TEXT DEFAULT 'KRW',       -- 통화 단위
    status TEXT NOT NULL,              -- 성공 여부 (succeeded, failed 등)
    orderId TEXT UNIQUE,               -- 주문 번호
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (userId) REFERENCES users (id)
);

-- 4. 서비스 사용량 제한 (API 호출 횟수 등 제어)
CREATE TABLE IF NOT EXISTS usage_limits (
    userId TEXT PRIMARY KEY,
    usageCount INTEGER DEFAULT 0,      -- 현재까지 사용한 횟수
    maxLimit INTEGER DEFAULT 10,       -- 플랜별 허용 한도
    lastResetDate INTEGER DEFAULT (strftime('%s', 'now')), -- 초기화 날짜
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);