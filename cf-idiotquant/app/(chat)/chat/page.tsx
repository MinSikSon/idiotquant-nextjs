"use client";

import { AiHistoryType, AiOutputType, pushAiHistory, reqPostLaboratory, selectAiHistory, selectAiOutput } from "@/lib/features/ai/aiSlice";
import React from "react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button } from "@material-tailwind/react";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Chat() {

    const dispatch = useAppDispatch();
    const aiOutput: AiOutputType = useAppSelector(selectAiOutput);
    const aiHistory: AiHistoryType[] = useAppSelector(selectAiHistory);

    const [question, setQuestion] = React.useState("");
    const [userContent, setUserContent] = React.useState("");
    const [waitResponse, setWaitResponse] = React.useState(false);

    const [history, setHistory] = React.useState<any>([]);

    React.useEffect(() => {
        console.log(`[Chat]`);
    }, []);

    React.useEffect(() => {
        console.log(`[aiOutput]`, aiOutput);
        setWaitResponse(false);

        if (aiOutput.state == "fulfilled") {
            const newAiHistory: AiHistoryType = {
                question,
                response: aiOutput.result.response,
                usage: aiOutput.result.usage,
                timestamp: new Date().toLocaleString("ko-KR"),
            }
            setHistory((prev: any) => [
                ...prev,
                newAiHistory
            ]);
            dispatch(pushAiHistory(newAiHistory));
        }

    }, [aiOutput]);

    React.useEffect(() => {
        console.log(`aiHistory`, aiHistory);
    }, [aiHistory]);

    function onClick(user_content: string) {
        console.log(`[Laboratory]`, `onClick`, user_content);
        dispatch(reqPostLaboratory({ system_content: "한글로 답변해 주세요. " + user_content, user_content: user_content }));
        setWaitResponse(true);
        setQuestion(user_content);
        setUserContent("");
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && userContent.trim()) {
            onClick(userContent); // 엔터 키 누르면 검색 버튼 클릭
        }
    };

    return <>
        <div className="font-mono flex flex-col">
            {/* <textarea
                className="p-2 m-2 border rounded-md border-gray-300 text-sm resize-y"
                rows={4}
                placeholder="주식 초보인데 시작은 어떻게 할까요?"
                value={userContent}
                onChange={(e) => setUserContent(e.target.value)}
            />
            <Button color="info" disabled={waitResponse} className="p-2 m-2" onClick={() => onClick(userContent)}>삼고초려</Button> */}
            <div className="w-full max-w-2xl mx-auto mt-4">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col gap-3">
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
                            disabled={waitResponse || !userContent.trim()}
                            onClick={() => onClick(userContent)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition
    ${waitResponse || !userContent.trim()
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-500 hover:bg-blue-600 text-white shadow"}`}
                        >
                            {waitResponse ? "⏳ 응답 생성 중..." : "🤖 AI에게 묻기"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {aiHistory.map((item: any, index: number) => (
                    <div key={index}
                        className="rounded-3xl border border-gray-100 shadow-md bg-gradient-to-br from-white to-gray-50 p-6 hover:shadow-lg transition-shadow duration-300"
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
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                )).reverse()}
            </div>
        </div>
    </>;
}
