import { createAppSlice } from "@/lib/createAppSlice";
import { PayloadAction } from "@reduxjs/toolkit";

export interface AiOutputResultUsageType {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
}

interface AiOutputResultType {
    response: string;
    usage: AiOutputResultUsageType;
}

export interface AiOutputType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;

    errors: any;
    messages: any;
    result: AiOutputResultType;
    success: any;
}

export interface AiHistoryType {
    question: string;
    response: string;
    usage: AiOutputResultUsageType;
    timestamp: string;
}

interface AiStreamType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;

    aiStreamOutput: string;
    aiHistory: AiHistoryType[];
}

const initialState: AiStreamType = {
    state: "init",
    aiStreamOutput: "",
    aiHistory: [],
};

interface StreamOutputType {
    response: string;
    tool_calls: any[];
    p: string;
}

export const aiStreamSlice = createAppSlice({
    name: "aiSlice",
    initialState,
    reducers: (create) => ({
        updateStreamingOutput: create.reducer((state, action: PayloadAction<any>) => {
            const newString: string = state.aiStreamOutput + action.payload;
            state.aiStreamOutput = newString;
        }),
        clearStream: create.reducer((state) => {
            state.aiStreamOutput = "";
        }),
        pushAiHistory: create.reducer((state, action: PayloadAction<AiHistoryType>) => {
            state.aiHistory.push(action.payload);
        }),
    }),
    selectors: {
        selectAiState: (state) => state.state,
        selectAiStreamOutput: (state) => state.aiStreamOutput,
        selectAiHistory: (state) => state.aiHistory,
    }
});


export const { clearStream, updateStreamingOutput, pushAiHistory } = aiStreamSlice.actions;
export const { selectAiStreamOutput, selectAiHistory } = aiStreamSlice.selectors;
