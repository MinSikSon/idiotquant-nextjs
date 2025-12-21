import dynamic from 'next/dynamic';

// SSR을 비활성화하여 브라우저에서만 컴포넌트를 렌더링합니다.
const SolarSystem = dynamic(() => import('@/components/solarSystem'), {
    ssr: false,
});

export default function Home() {
    return (
        <main style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <SolarSystem />
        </main>
    );
}