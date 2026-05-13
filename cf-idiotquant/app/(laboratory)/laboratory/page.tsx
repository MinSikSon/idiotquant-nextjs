'use client'; // 클라이언트 컴포넌트 선언

import dynamic from 'next/dynamic';

// 브라우저 환경에서만 Three.js 등을 사용하는 컴포넌트를 불러옵니다.
const SolarSystem = dynamic(() => import('@/components/solarSystem'), {
    ssr: false,
    // 로딩 중 표시할 UI가 있다면 추가 가능합니다.
    loading: () => <div style={{ width: '100vw', height: '100vh', backgroundColor: 'black' }} />,
});

export default function LaboratoryClient() {
    return (
        <main style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <SolarSystem />
        </main>
    );
}