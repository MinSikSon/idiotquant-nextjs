# 🎯 Project Context & Agent Rules: IdiotQuant

이 문서는 AI 코딩 에이전트가 프로젝트의 정체성, 도메인 규칙, 기술 스택을 완벽하게 이해하고 일관된 코드를 생성할 수 있도록 가이드하는 마스터 컨텍스트 파일입니다.

---

## 1. 🚀 프로젝트 개요 (Project Core)
- **프로젝트명:** IdiotQuant (이디엇퀀트)
- **핵심 목표:** 벤자민 그레이엄의 NCAV(Net Current Asset Value, 순유동자산) 전략을 기반으로 한 소외된 초저평가 퀀트 종목 발굴 플랫폼.
- **개발 철학:** 최소한의 기능으로 사용자에게 최고의 가치를 주는 MLP (Minimum Lovable Product) 단계를 지향하며, 점진적으로 고도화한다.

---

## 2. 📊 핵심 도메인 금융 공식 (Financial Metrics)
에이전트는 퀀트 필터링 로직이나 백테스팅, 데이터 스크래핑 코드를 작성할 때 반드시 아래 정의된 공식을 엄격하게 준수해야 한다.

- **순유동자산 (NCAV) 계산 규칙:**
  $$\text{Net Current Assets} = \text{Current Assets (유동자산)} - \text{Total Liabilities (총부채)}$$
  *(주의: 총부채를 빼야 하며, 유동부채만 빼는 실수를 범하지 말 것)*
- **투자 대상 선정 기준 (NCAV 전략 기본):**
  $$\text{Market Cap (시가총액)} < \text{Net Current Assets} \times 0.67$$
  *(시가총액이 순유동자산의 2/3 이하로 거래되는 종목을 최우선 필터링한다)*

---

## 🛠️ 3. 기술 스택 및 아키텍처 (Tech Stack & Infrastructure)
코드를 제안하거나 리팩토링할 때 플랫폼 환경의 제약 조건을 반영해야 한다.

- **Frontend / Full-Stack Framework:** Next.js (App Router 구조 준수)
- **Language:** TypeScript (Strict Mode 기반, 명시적 타입 선언 필수)
- **Styling:** Tailwind CSS (유지보수가 쉬운 모듈형 유틸리티 클래스 활용)
- **Cloud Infrastructure:** Cloudflare Ecosystem
  - **Runtime:** Edge Runtime 환경 최적화 고려
  - **Database:** Cloudflare D1 (Serverless SQL Database)
  - **Storage:** Cloudflare KV (Key-Value Storage for caching metadata)
  - **Hosting:** Cloudflare Workers & Pages

---

## ⚖️ 4. 에이전트 코딩 규칙 (Agent Implementation Rules)
- **RSC 우선:** Next.js App Router 내에서 기본적으로 React Server Components (RSC)를 활용하고, `useState`나 `useEffect` 등 클라이언트 인터랙션이 절대적으로 필요한 경우에만 제한적으로 `'use client'` 컴포넌트로 분리한다.
- **코드 누락 금지:** 리팩토링이나 코드 생성 요청 시 중간 과정을 `// 기존 코드 동일` 등으로 생략하지 말고, 복사해서 바로 쓸 수 있는 **전체 풀 소스코드**를 제공한다.
- **언어 규칙:** 모든 코드 설명, 개발 가이드, 소스코드 내 주석(JSDoc 포함)은 자연스럽고 명확한 **한글**로 작성한다.
- **코드 읽기 전략:** 에이전트는 질문을 받으면 이미 프로젝트 소스코드 전반의 인덱싱(Embeddings)을 마쳤다고 가정하고 답변한다. 필요한 경우 추가 승인을 요청하지 말고 사용자에게 관련 파일 경로를 언급하며 코드를 즉시 출력한다.