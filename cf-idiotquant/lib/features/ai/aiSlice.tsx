import { createAppSlice } from "@/lib/createAppSlice";
import { postLaboratory } from "./aiAPI";

interface AiOutputResultUsageType {
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

interface AiType {
    state: "init"
    | "pending" | "fulfilled" | "rejected"
    ;

    aiOutput: AiOutputType;
}

const initialState: AiType = {
    state: "init",
    aiOutput: {
        state: "init",
        errors: null,
        messages: null,
        result: {
            response: "",
            usage: {
                completion_tokens: 0,
                prompt_tokens: 0,
                total_tokens: 0,
            }
        },
        success: null,
    }
}

export const aiSlice = createAppSlice({
    name: "aiSlice",
    initialState,
    reducers: (create) => ({
        reqPostLaboratory: create.asyncThunk(
            async ({ system_content, user_content }: { system_content: string, user_content: string }) => {
                return await postLaboratory(system_content, user_content);
            },
            {
                pending: (state) => {
                    console.log(`[reqPostLaboratory] pending`);
                    state.state = "pending";
                },
                fulfilled: (state, action) => {
                    console.log(`[reqPostLaboratory] fulfilled`, `action.payload`, typeof action.payload, action.payload);
                    // if (undefined != action.payload["output1"]) 
                    {
                        state.aiOutput = { ...action.payload, state: "fulfilled" };
                        state.state = "fulfilled";
                    }
                },
                rejected: (state) => {
                    console.log(`[reqPostLaboratory] rejected`);
                    state.state = "rejected";
                },
            }
        ),
    }),

    selectors: {
        selectAiState: (state) => state.state,
        selectAiOutput: (state) => state.aiOutput,
    }
});

export const { reqPostLaboratory } = aiSlice.actions;
export const { selectAiState, selectAiOutput } = aiSlice.selectors;