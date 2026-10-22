export default function ScanRefreshNotice({ refreshing, error, onRetry }: {
    refreshing: boolean;
    error: string | null;
    onRetry: () => void;
}) {
    if (!refreshing && !error) return null;
    return (
        <p role="status" className="my-2 flex flex-wrap items-center gap-2 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            {refreshing ? "기존 결과를 표시하며 최신 목록을 확인하고 있습니다." : <>
                <span>최신 목록을 확인하지 못해 이전 결과를 표시합니다.</span>
                <button type="button" onClick={onRetry} className="min-h-9 px-2 font-medium text-brand-ink hover:underline">다시 시도</button>
            </>}
        </p>
    );
}
