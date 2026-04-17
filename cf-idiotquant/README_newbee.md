# 🚀 Welcome to cf-idiotquant!

안녕하세요! Next.js 기반의 퀀트 투자 플랫폼 `cf-idiotquant` 프로젝트에 오신 것을 환영합니다.
이 가이드는 프로젝트를 처음 설정하고 개발을 시작하는 데 필요한 기본적인 정보를 제공합니다.

##  사전 준비 (Prerequisites)

- **Node.js**: 프로젝트 루트의 `.nvmrc` 파일에 명시된 버전을 사용하는 것을 강력히 권장합니다. [nvm](https://github.com/nvm-sh/nvm) 또는 [nvm-windows](https://github.com/coreybutler/nvm-windows)를 사용해 버전을 관리해주세요.
- **Yarn**: 이 프로젝트는 `yarn`을 패키지 매니저로 사용합니다. (`yarn.lock` 파일 존재)

## 🏁 시작하기 (Getting Started)

1.  **저장소 복제 (Clone Repository)**
    ```bash
    git clone <repository-url>
    cd cf-idiotquant
    ```

2.  **Node.js 버전 설정 (Set Node.js version)**
    ```bash
    # .nvmrc 파일에 맞는 버전으로 자동 전환
    nvm use
    ```

3.  **의존성 설치 (Install Dependencies)**
    ```bash
    yarn install
    ```

4.  **환경 변수 설정 (Environment Variables)**
    `.env.example` 파일이 있다면, 해당 파일을 복사하여 `.env.local` 파일을 생성하고 필요한 환경 변수를 채워주세요. (API 키, 데이터베이스 정보 등)
    ```bash
    cp .env.example .env.local
    ```
    > `vi .env.local` 또는 다른 편집기로 파일을 열어 변수를 설정하세요.

5.  **개발 서버 실행 (Run Development Server)**
    ```bash
    yarn dev
    ```
    이제 브라우저에서 `http://localhost:3000`으로 접속하여 애플리케이션을 확인할 수 있습니다.

## 📜 주요 스크립트 (Key Scripts)

`package.json`에 정의된 주요 스크립트입니다.

- `yarn dev`: 개발 모드로 Next.js 앱을 실행합니다.
- `yarn build`: 프로덕션용으로 앱을 빌드합니다.
- `yarn start`: 빌드된 프로덕션 서버를 실행합니다.
- `yarn lint`: ESLint를 사용하여 코드 스타일 문제를 확인합니다.

## 📂 프로젝트 구조 (Project Structure)

```
/
├── app/                  # Next.js App Router 기반 라우팅 및 페이지
│   ├── (feature)/        # 기능별 그룹 라우팅
│   └── layout.tsx        # 메인 레이아웃
├── components/           # 재사용 가능한 UI 컴포넌트
├── lib/                  # Redux Toolkit, API 로직, 헬퍼 함수 등
│   └── features/         # Redux Toolkit Slices (기능별 상태관리)
├── public/               # 정적 파일 (이미지, 폰트 등)
├── tailwind.config.ts    # Tailwind CSS 설정
├── next.config.mjs       # Next.js 설정
└── wrangler.toml         # Cloudflare Workers 배포 설정
```

## ✨ 핵심 기술 스택 (Core Tech Stack)

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Deployment**: [Cloudflare Pages/Workers](https://workers.cloudflare.com/)

## 🎨 코딩 컨벤션 (Coding Conventions)

- **Formatting**: [Prettier](https://prettier.io/)가 코드 포맷을 자동으로 관리합니다.
- **Linting**: [ESLint](https://eslint.org/)를 사용하여 코드 품질을 유지합니다.

커밋하기 전에 `yarn lint`를 실행하여 잠재적인 오류를 확인하는 습관을 들이는 것이 좋습니다.
