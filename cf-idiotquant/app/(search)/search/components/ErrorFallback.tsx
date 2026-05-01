import React from 'react';
import { Button, Callout, Icon, Intent } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 rounded-full">
        <Icon icon={IconNames.NOTIFICATIONS} size={48} className="text-red-5im" />
      </div>

      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        데이터를 불러오는 중 문제가 발생했습니다
      </h3>

      <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md">
        {error.message ||
          '주식 정보를 가져오는 중에 예상치 못한 오류가 발생했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요.'}
      </p>

      <div className="flex gap-3">
        <Button
          intent={Intent.DANGER}
          className="!rounded-xl !px-6 !py-2 font-bold"
          onClick={resetErrorBoundary}
        >
          <Icon icon={IconNames.REFRESH} size={16} className="mr-2" />
          다시 시도
        </Button>
        <Button
          className="!rounded-xl !px-6 !py-2 font-bold"
          onClick={() => window.location.reload()}
        >
          새로고침
        </Button>
      </div>

      <div className="mt-12 text-xs text-zinc-400 uppercase tracking-widest">
        Error Code: ERR_STOCK_FETCH_FAILURE
      </div>
    </div>
  );
}
