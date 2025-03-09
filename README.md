# 서비스 확인
- https://idiotquant.com

# cloudflare worker log 확인
- $ wrangler tail

# NEXT.JS

- https://nextjs.org/learn/foundations/about-nextjs/what-is-nextjs

# Next.js

- 강사 : 최지민 (FE) - 토스 증권 리드
- 글로벌 커머스 서비스 / 금융 서비스
- 기획/영업/회계 -> 개발자
- 무엇을 모르는지 아는 것이 천재적인 것보다 유용하다 - 찰리 멍거

# 2

- https://nextjs.org/
- reactjs - lib 를 표방

## framework 와 library

- framework - 기반구조, library - 도구모음
- 제어 주도권 프레임워크가 가짐 vs 제어 주도권 사용자가 가짐 (가짐, 갖음: 준말은 모음 어미와 결합할 수 없음. 갖으시다 x)
- 프레임워크는 기계 vs 라이브러리는 공구
- 프레임워크 자유도 상대적으로 작음 vs 자유도 상대적으로 큼

## Next.js 장점

- 규모가 있는 서비스 구조 설계를 어떻게 할 것인가?
- SEO(검색 엔진 최적화)
- 손쉬운 배포 시스템 Vercel

## Next.js 대체재 읍나?

- 대표적인 React 프레임워크
- gatsby, remix 등 있음

## 소개 및 환경설정

- node, yarn, git, vscode
- Nextjs 프로젝트 생성
  `npx create-next-app nextjs-blog --use-npm --example "https://github.com/vercel/next-learn/tree/master/basics/learn-starter"`

# 2.2 - Data **Fetching**

- 화면에 뭔가를 그린다 -> 어디선가 data 가져와야 함.

## Next.js 가 제시하는 data fetching 방법

1. SSR : 서버가 데이터 가져와서 그림
2. CSR : client side rendering
3. SSG : static site generation. dev 환경에서는 마치 server side rendering 하는 것처럼 보이지만 아니라네..?
4. ISR :


# 미국장 ticker 참고
- https://github.com/rreichel3/US-Stock-Symbols/tree/main