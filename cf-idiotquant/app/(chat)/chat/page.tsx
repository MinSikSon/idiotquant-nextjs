"use client";

import { reqPostLaboratory } from "@/lib/features/ai/aiSlice";
import { useState, useEffect, KeyboardEvent } from "react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import dynamic from 'next/dynamic';

const ReactMarkdown = dynamic(() => import('react-markdown'));
// import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { AiHistoryType, AiOutputResultUsageType, pushAiHistory, selectAiHistory, selectAiStreamOutput } from "@/lib/features/ai/aiStreamSlice";

const DEBUG = false;

export default function Chat() {
    const dispatch = useAppDispatch();
    // const aiOutput: AiOutputType = useAppSelector(selectAiOutput);
    const aiHistory: AiHistoryType[] = useAppSelector(selectAiHistory);

    const [question, setQuestion] = useState("");
    const [userContent, setUserContent] = useState("");
    const [waitResponse, setWaitResponse] = useState(false);

    const aiStreamOutput: string = useAppSelector(selectAiStreamOutput);

    const [response, setResponse] = useState<string>("");

    useEffect(() => {
        if (DEBUG) console.log(`[Chat]`);
        import('katex/dist/katex.min.css');
    }, []);

    useEffect(() => {
        // console.log(`aiStreamOutput`, aiStreamOutput);
        let buffer: string = aiStreamOutput;
        const lines = buffer.split('\n');

        // 마지막 줄은 아직 다 안 온 걸 수 있으니 남겨둠
        buffer = lines.pop() || "";

        let outputContent = "";
        let outputUsage: AiOutputResultUsageType = { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();

                if (jsonStr === '[DONE]') {
                    // console.log('Stream ended');
                    const newAiHistory: AiHistoryType = {
                        question,
                        response: outputContent,
                        usage: outputUsage,
                        timestamp: new Date().toLocaleString("ko-KR"),
                    }
                    // console.log(`newAiHistory`, newAiHistory);
                    dispatch(pushAiHistory(newAiHistory));

                    setWaitResponse(false);

                    break;
                }

                try {
                    const parsed = JSON.parse(jsonStr);
                    const content = parsed.response;
                    if (content) {
                        if (DEBUG) console.log('응답 추가:', content, `, typeof jsonStr`, typeof jsonStr, `, parsed`, parsed);
                        outputContent += content;
                        // 여기서 바로 파싱하거나 UI에 반영
                    }
                    const usage = parsed.usage;
                    if (usage) {
                        // console.log(`토큰`, usage);
                        outputUsage = usage;
                    }
                } catch (e) {
                    console.error('JSON 파싱 실패:', jsonStr);
                }
            }
        }

        setResponse(outputContent);
    }, [aiStreamOutput]);

    useEffect(() => {
        // console.log(`aiHistory`, aiHistory);
    }, [aiHistory]);


    function onClick(user_content: string) {
        // console.log(`[Laboratory]`, `onClick`, user_content);
        dispatch(reqPostLaboratory({ system_content: "한글로 답변해 주세요. " + user_content, user_content: user_content }));
        setWaitResponse(true);
        setQuestion(user_content);
        // setUserContent("");
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && userContent.trim()) {
            onClick(userContent); // 엔터 키 누르면 검색 버튼 클릭
        }
    };

    return <>
        <div className="dark:!bg-gray-200 font-mono flex flex-col">
            <div className="dark:!bg-gray-200 w-full max-w-2xl mx-auto mt-4">
                <div className="dark:!bg-gray-200 bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col gap-3">
                    <label htmlFor="userContent" className="text-sm text-gray-600 font-semibold">
                        📩 AI에게 물어보세요
                    </label>
                    <input
                        id="userContent"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition resize-none"
                        placeholder="예: 주식 초보인데 시작은 어떻게 할까요?"
                        value={userContent}
                        onChange={(e) => setUserContent(e.target.value)}
                        onKeyUp={handleKeyDown}
                    />
                    <div className="flex justify-end">
                        <button
                            // disabled={waitResponse || !userContent.trim()}
                            onClick={() => onClick(userContent)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition
    ${waitResponse || !userContent.trim()
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-500 hover:!bg-blue-600 text-white shadow"}`}
                        >
                            {waitResponse ? "⏳ 응답 생성 중..." : "🤖 AI에게 묻기"}
                        </button>
                    </div>
                </div>
            </div>
            <div className="dark:!bg-gray-200 rounded-3xl border border-gray-100 shadow-md bg-gradient-to-br from-white to-gray-50 p-6 hover:shadow-lg transition-shadow duration-300">
                <div className="text-[14px] prose prose-sm max-w-none text-gray-800 leading-relaxed">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                        skipHtml={false} // HTML 태그도 렌더링하도록
                    >
                        {response}
                    </ReactMarkdown>
                </div>
            </div>

            {/* 대화 기록이 없을 때 예시 질문 가이드 */}
            {(!aiHistory || aiHistory.length === 0) && !waitResponse && (
                <div className="dark:!bg-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
                    {[
                        "NCAV 투자 전략이란 무엇인가요?",
                        "PER, PBR, PEG 지표를 어떻게 활용하나요?",
                        "국내 주식과 미국 주식 중 어느 쪽이 초보에게 적합할까요?",
                        "그레이엄의 순유동자산(NCAV) 계산 방법을 알려주세요.",
                    ].map((prompt) => (
                        <button
                            key={prompt}
                            onClick={() => { setUserContent(prompt); onClick(prompt); }}
                            className="text-left px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            <div className="dark:!bg-gray-200 space-y-4">
                {!!aiHistory ? aiHistory.map((item: any, index: number) => (
                    <div key={index}
                        className="dark:!bg-gray-200 rounded-3xl border border-gray-100 shadow-md bg-gradient-to-br from-white to-gray-50 p-6 hover:shadow-lg transition-shadow duration-300"
                    // className="border border-gray-200 rounded-2xl shadow-sm p-4 bg-white"
                    >
                        <div className="text-xs text-gray-400 text-right mb-2">
                            🕒 {item.timestamp}
                        </div>
                        {/* <div className="border rounded-lg border-gray-200"> */}
                        <div className="mb-4">
                            {/* <div className="text-gray-500 text-xs"> */}
                            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                                🙋 질문
                            </div>
                            {/* <div className="text-sm font-medium text-gray-800 whitespace-pre-wrap"> */}
                            <div className="text-[14px] font-semibold text-gray-800 whitespace-pre-wrap">
                                {item.question}
                            </div>
                        </div>
                        {/* <div className="mb-2"> */}
                        <div className="mb-4">
                            {/* <div className="text-gray-500 text-xs"> */}
                            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                                🤖 응답
                            </div>
                            {/* <div className="prose prose-sm max-w-none text-gray-800"> */}
                            <div className="text-[14px] prose prose-sm max-w-none text-gray-800 leading-relaxed">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                                    skipHtml={false} // HTML 태그도 렌더링하도록
                                >
                                    {item.response}
                                </ReactMarkdown>
                            </div>
                        </div>
                        {/* <div className="p-1 m-1 flex border rounded-lg border-gray-200 items-center"> */}
                        <div className="p-1 m-1 flex border rounded-lg border-gray-200 items-center">
                            <div className="text-[0.6rem]">
                                🧮 total_tokens({item.usage.total_tokens}) = prompt_tokens({item.usage.prompt_tokens}) + completion_tokens({item.usage.completion_tokens})
                            </div>
                        </div>
                    </div>
                )).reverse()
                    : <></>}
            </div>
        </div >
        <div className="dark:!bg-black h-lvh"></div>
    </>;
}
