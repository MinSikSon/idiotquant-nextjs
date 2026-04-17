# 프로젝트 분석: cf-idiotquant

## 1. 개요

`cf-idiotquant` 프로젝트는 "지능형 투자 허브(Intelligent Investment Hub)"로 설계된 Next.js 애플리케이션입니다. 주식 가치 평가, 수익률 계산기, 자동 매매 알고리즘(NCAV 전략) 등 다양한 퀀트 금융 도구를 제공합니다.

이 코드베이스는 매우 모듈화되어 있으며, Next.js App Router를 사용하여 각 서비스(예: `(algorithm-trade)`, `(calculator)`, `(search)`)를 별도의 라우트 그룹으로 관리합니다. `@blueprintjs/core`, `framer-motion`, `three.js`와 같은 고급 UI 라이브러리를 통합하여 매우 인터랙티브하고 데이터 중심적인 사용자 경험을 제공합니다.

## 2. 코드베이스 구조 분석

### 📂 디렉토리 구조

- **`app/`**: App Router를 사용하며 라우트 그룹(예: `(home)`, `(api)`, `(algorithm-trade)`)을 광범위하게 활용합니다. 이는 모듈성을 높여주지만, 디렉토리 깊이가 깊어질 수 있습니다.
- **`src/`**: `Backgrounds`, `Components`, `TextAnimations`와 같은 특화된 UI 요소들을 포함합니다 (고품질 시각 효과를 위한 용도로 보임).
- **`lib/`**: 비즈니스 로직의 핵심입니다.
  - `features/`: 도메인별로 매우 구조화되어 있습니다 (예: `algorithmTrade`, `financialInfo`, `koreaInvestment`). 확장이 용이한 강력한 패턴입니다.
  - `actions.tsx`, `store.tsx`, `hooks.tsx`: 중앙 집중식 상태 관리(Redux) 및 데이터 페칭 로직을 포함합니다.
- **`components/`**: 재사용 가능한 UI 컴포넌트들 (Radix UI, BlueprintJS).

### 🛠 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **상태 관리**: Red/Redux Toolkit (`@reduxjs/toolkit`)
- **스타일링**: Tailwind CSS, PostCSS, BlueprintJS, Radix UI
- **애니메이션**: Framer Motion, GSAP, Three.js, OGL
- **데이터베이스/ORM**: Drizzle ORM (`d1-adapter`, `drizzle-adapter`), Cloudflare D1/Workers 통합 암시.
- **인증**: NextAuth.js (Auth.js)

## 3. 강점

- **도메인 주도 설계 (DDD)**: `lib/features` 디렉토리는 `koreaInvestment`와 같은 복잡한 로직을 분리하여 핀테크 앱에 최적화된 구조를 가집니다.
- **높은 시각적 완성도**: GSAP, Three.js 및 고급 애니메이션 사용은 프리미엄급, 즉 "Lovable"한 제품 경험을 제공할 가능성을 보여줍니다.
- **모듈형 라우팅**: 라우트 그룹을 통해 서비스별로 애플리케이션을 쉽게 탐색하고 확장할 수 있습니다.
- **타입 안정성**: 프로젝트 전반에 걸쳐 TypeScript를 강력하게 사용하여 안정성을 확보했습니다.

## 4. 개선 포인트 (MVP/MLP 집중을 위한 제언)

기능이 풍부한 실험적 코드베이스에서 **최소 기능 제품(MVP)** 또는 **최소 사랑받는 제품(MLP)**으로 전환하려면, "기능 추가"에서 "핵심 가치 제안의 정교화"로 초점을 옮겨야 합니다.

### 🎯 전략적 집중: MVP/MLP 전환

현재 프로젝트에는 "기능이 완성된 듯한" 많은 라우트들(예: `(ads)`, `(backtest)`, `(laboratory)`)이 존재합니다. MLP는 **주요 경로**(가치 평가 $\rightarrow$ 전략 $\rightarrow$ 결과)를 정교하게 다듬는 데 집중해야 합니다.

### 🛠 기술 및 제품 개선 사항

#### 1. 기능 통합 (Feature Consolidation, "기능 비대화" 방지)

- **문제점**: 너무 많은 실험적 라우트(`(laboratory)`, `(backtest)`)가 사용자의 집중을 흐트러뜨릴 수 있습니다.
- **해결책**: 핵심 "Hero" 기능(예: 가치 평가를 위한 `(search)`, `(algorithm-trade)`)을 식별하고, 실험적 기능들은 "Beta" 또는 "Lab" 섹션으로 이동시켜 메인 UI를 깔끔하고 "사랑스러운(lovable)" 상태로 유지합니다.

#### 2. 성능 최적화

- **문제점**: `three.js`, `gsap`, `motion`의 과도한 사용은 모바일 기기에서 "상호작용 가능 시간(TTI)"을 늦출 수 있습니다.
- **해결책**: 무거운 3D/애니메이션 컴포넌트에 대해 공격적인 코드 분할(Code Splitting)과 동적 임포트(Dynamic Import)를 적용합니다. 핵심 유틸리티인 "가치 평가" 도구는 즉각적으로 로드되도록 보장해야 합니다.

#### 3. 통합 디자인 시스템

- **문제점**: `BlueprintJS`, `Radix UI`, `Tailwind`가 혼재되어 사용되고 있습니다. 강력한 도구들이지만 사용자 인터랙션의 일관성을 해칠 수 있습니다.
- **해결책**: 단일 디자인 언어(예: Radix + Tailwind 중심)를 기준으로 인터랙션 패턴(모달, 버튼, 입력창 등)을 표준화하여 제품이 일관되고 전문적으로 보이도록 합니다 합니다.

#### 4. 데이터 신뢰성 및 에러 핸들링

- **문제점**: 핀테크 앱은 외부 API(`fmpUsMarket`, `koreaInvestment`)에 대한 의존도가 매우 높습니다.
- **해결책**: 견고한 Error Boundary와 "Graceful Degradation(우아한 기능 저하)" UI를 구현합니다. 시장 API가 실패하더라도 사용자는 깨진 컴포넌트를 보는 대신 "데이터를 일시적으로 불러올 수 없습니다"라는 명확한 메시지를 확인해야 합니다.

#### 5. 인증 및 사용자 온보딩

- **문제점**: `(algorithm-trade)`와 같은 기능은 인증이 필요하지만, "게스트"에서 "사용자"로의 전환이 매끄러워야 합니다.
- **해결책**: `(login)` 흐름을 단순화합니다. 사용자가 로그인하기 전에도 "프리미엄" 기능의 가치를 즉시 확인할 수 있도록 합니다( `(home)`의 게스트 접근 권한 활용).

## 5. 개발 경로 요약

1.  **핵심 정의**: 가장 안정적인 2가지 핵심 기능을 선택합니다 (예: 가치 평가 & 계산기).
2.  **UX 정교화**: 기존의 애니메이션 기술을 활용하여 이 2가지 기능이 "마법 같은(magical)" 경험을 주도록 만듭니다 (이것이 "Lovable"의 핵심입니다).
3.  **나머지 정리**: 그 외의 기능들은 "준비 중" 또는 "실험실" 상태로 이동시킵니다.
4.  **안정화**: 에러 핸들링과 데이터 정확성에 집중합니다.
