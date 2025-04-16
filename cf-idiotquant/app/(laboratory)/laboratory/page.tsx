"use client";

import { AiOutputType, reqPostLaboratory, selectAiOutput } from "@/lib/features/ai/aiSlice";
import React from "react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button } from "@material-tailwind/react";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Laboratory() {

    const dispatch = useAppDispatch();
    const aiOutput: AiOutputType = useAppSelector(selectAiOutput);

    const [userContent, setUserContent] = React.useState("");
    const [waitResponse, setWaitResponse] = React.useState(false);

    React.useEffect(() => {
        console.log(`[Laboratory]`);
    }, []);

    React.useEffect(() => {
        console.log(`[aiOutput]`, aiOutput);
        setWaitResponse(false);
    }, [aiOutput]);


    function onClick(user_content: string) {
        console.log(`[Laboratory]`, `onClick`, user_content);
        dispatch(reqPostLaboratory({ system_content: "답변은 한글로, 투자, 주식, 퀀트 투자", user_content: user_content }));
        setWaitResponse(true);
    }

    return <>
        <div className="font-mono flex flex-col">
            <textarea
                className="p-2 m-2 border rounded-md border-gray-300 text-sm resize-y"
                rows={4}
                placeholder="주식 초보인데 시작은 어떻게 할까요?"
                value={userContent}
                onChange={(e) => setUserContent(e.target.value)}
            />
            <Button color="info" disabled={waitResponse} className="p-2 m-2" onClick={() => onClick(userContent)}>삼고초려</Button>

            <div className="p-1 m-1">
                {aiOutput.state == "fulfilled" ?
                    <>
                        <div className="border rounded-lg border-gray-200">
                            <div>
                                응답
                            </div>
                            <div className="text-xs">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {aiOutput.result.response}
                                </ReactMarkdown>
                            </div>
                        </div>
                        <div className="p-1 m-1 border rounded-lg border-gray-200">
                            <div>
                                사용 token
                            </div>
                            <div className="text-xs">
                                total_tokens({aiOutput.result.usage.total_tokens}) = prompt_tokens({aiOutput.result.usage.prompt_tokens}) + completion_tokens({aiOutput.result.usage.completion_tokens})
                            </div>
                        </div>
                    </>
                    :
                    <>
                        <div>
                            {waitResponse ? "wait response" : ""}
                        </div>
                    </>
                }
            </div>
        </div>
    </>;
}
