"use client";

export const runtime = "edge";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <main style={{ padding: "3rem", fontFamily: "sans-serif" }}>
          <h1>문제가 발생했습니다</h1>
          <p>잠시 후 다시 시도해 주세요.</p>
          <button type="button" onClick={() => reset()}>
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
