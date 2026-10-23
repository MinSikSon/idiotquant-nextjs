import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  { ignores: ['.next/**', '.vercel/**', 'node_modules/**', 'public/**', 'game-art-src/**'] },
  // React Compiler는 아직 사용하지 않는다. 이행 진단은 경고로 남기고 훅 순서는 오류로 검사한다.
  { rules: {
    'react-hooks/set-state-in-effect': 'warn',
    'react-hooks/refs': 'warn',
    'react-hooks/immutability': 'warn',
    'react-hooks/use-memo': 'warn',
  } },
  // 게임 엔진의 useAltar/useClassSkill 등은 React 훅이 아니라 게임 행동 함수다.
  { files: ['lib/rogue/**/*.ts'], rules: { 'react-hooks/rules-of-hooks': 'off' } },
];

export default config;
