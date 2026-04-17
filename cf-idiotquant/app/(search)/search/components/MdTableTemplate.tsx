"use client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MdTableTemplate = ({ content }: { content: string }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            table: ({ ...p }) => (
                <table className="w-full table-auto border-collapse text-[11px] sm:text-sm dark:text-zinc-300" {...p} />
            ),
            th: ({ ...p }) => (
                <th className="px-3 py-2 bg-gray-50 dark:bg-zinc-900 font-bold text-left border-b dark:border-zinc-800 text-zinc-600 dark:text-zinc-400" {...p} />
            ),
            td: ({ children, ...p }) => {
                // 수익률(%) 데이터가 포함된 경우 강조 로직
                const text = String(children);
                const isPercentage = text.includes('%');
                const numValue = parseFloat(text);

                let textColor = "text-zinc-700 dark:text-zinc-300";
                let fontWeight = "font-mono";

                if (isPercentage && !isNaN(numValue)) {
                    if (numValue >= 30) {
                        textColor = "text-blue-600 dark:text-blue-400 font-black"; // 30% 이상 초강조
                    } else if (numValue < 0) {
                        textColor = "text-red-500 dark:text-red-400"; // 마이너스 수익률
                    }
                }

                return (
                    <td className={`px-3 py-2 border-b dark:border-zinc-800 text-right ${fontWeight} ${textColor}`} {...p}>
                        {children}
                    </td>
                );
            },
        }}
    >
        {content}
    </ReactMarkdown>
);