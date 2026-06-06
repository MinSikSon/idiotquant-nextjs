'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function SearchRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();
    useEffect(() => {
        const ticker = searchParams.get('ticker');
        router.replace(ticker ? `/analyze?ticker=${encodeURIComponent(ticker)}` : '/analyze');
    }, [router, searchParams]);
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#fcfaf7] dark:bg-[#1a1915]">
            <Loader2 className="animate-spin text-[#16a34a]" size={24} />
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#fcfaf7] dark:bg-[#1a1915]">
                <Loader2 className="animate-spin text-[#16a34a]" size={24} />
            </div>
        }>
            <SearchRedirect />
        </Suspense>
    );
}
